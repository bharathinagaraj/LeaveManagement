import pool from "../config/db.js";
import { AppError } from "../utils/errors.js";
import { countWorkingDays, validateDateRange } from "../utils/dateUtils.js";

const LEAVE_TYPES = ["earned", "sick"];

export const getBalances = async (userId) => {
  const result = await pool.query(
    "SELECT earned_leave, sick_leave FROM leave_balances WHERE employee_id = $1",
    [userId]
  );
  const row = result.rows[0];
  if (!row) throw new AppError("Leave balance not found", 404);
  return { earnedLeave: row.earned_leave, sickLeave: row.sick_leave };
};

export const getLeaveById = async (leaveId) => {
  const result = await pool.query(
    `SELECT l.*, u.name AS employee_name, u.email AS employee_email
     FROM leaves l
     JOIN employees u ON u.id = l.employee_id
     WHERE l.id = $1`,
    [leaveId]
  );
  return result.rows[0] || null;
};

export const listMyRequests = async (userId) => {
  const result = await pool.query(
    `SELECT id, leave_type, start_date, end_date, days, reason, status, reviewed_by, reviewed_at, created_at, updated_at
     FROM leaves
     WHERE employee_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(mapLeave);
};

const mapLeave = (row) => ({
  id: row.id,
  leaveType: row.leave_type,
  startDate: row.start_date,
  endDate: row.end_date,
  days: row.days,
  reason: row.reason,
  status: row.status,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  employeeName: row.employee_name,
  employeeEmail: row.employee_email,
});

/**
 * Creates a leave request. Runs inside a transaction and locks the employee's
 * balance row so overlapping requests and balance checks are race-safe.
 */
export const createRequest = async (userId, { leaveType, startDate, endDate, reason }) => {
  if (!LEAVE_TYPES.includes(leaveType)) {
    throw new AppError("Leave type must be 'earned' or 'sick'", 400);
  }
  const dateError = validateDateRange(startDate, endDate);
  if (dateError) throw new AppError(dateError, 400);

  const days = countWorkingDays(startDate, endDate);
  if (days === 0) {
    throw new AppError("Leave must include at least one working day", 400);
  }

  const trimmedReason = String(reason || "").trim();
  if (!trimmedReason) throw new AppError("A reason is required", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Serialize requests for this user so concurrent submissions cannot both pass overlap/balance checks.
    await client.query(
      "SELECT employee_id FROM leave_balances WHERE employee_id = $1 FOR UPDATE",
      [userId]
    );

    const overlaps = await client.query(
      `SELECT id FROM leaves
       WHERE employee_id = $1
         AND status IN ('pending', 'approved')
         AND start_date <= $3
         AND end_date >= $2
       LIMIT 1`,
      [userId, startDate, endDate]
    );
    if (overlaps.rows.length > 0) {
      throw new AppError("Leave request overlaps an existing pending or approved request", 400);
    }

    const balance = await client.query(
      `SELECT earned_leave, sick_leave FROM leave_balances WHERE employee_id = $1`,
      [userId]
    );
    const row = balance.rows[0];
    if (!row) throw new AppError("Leave balance not found", 404);

    const available = leaveType === "earned" ? row.earned_leave : row.sick_leave;
    if (days > available) {
      throw new AppError(`Insufficient ${leaveType === "earned" ? "earned" : "sick"} leave balance`, 400);
    }

    const result = await client.query(
      `INSERT INTO leaves (employee_id, leave_type, start_date, end_date, days, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, leave_type, start_date, end_date, days, reason, status, created_at`,
      [userId, leaveType, startDate, endDate, days, trimmedReason]
    );

    await client.query("COMMIT");
    return mapLeave(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const cancelRequest = async (userId, leaveId) => {
  const result = await pool.query(
    `UPDATE leaves
     SET status = 'cancelled', updated_at = now()
     WHERE id = $1 AND employee_id = $2 AND status = 'pending'
     RETURNING id, leave_type, start_date, end_date, days, reason, status, created_at`,
    [leaveId, userId]
  );

  if (result.rows.length === 0) {
    const existing = await pool.query(
      "SELECT status FROM leaves WHERE id = $1 AND employee_id = $2",
      [leaveId, userId]
    );
    if (existing.rows.length === 0) {
      throw new AppError("Leave request not found", 404);
    }
    throw new AppError(`Only pending requests can be cancelled (current status: ${existing.rows[0].status})`, 400);
  }

  return mapLeave(result.rows[0]);
};