import pool from "../config/db.js";
import { AppError } from "../utils/errors.js";

const PROCESSED_STATUSES = ["approved", "rejected"];

export const listRequests = async (managerId, status) => {
  const params = [managerId];
  let where = "";
  if (status && ["pending", "approved", "rejected", "cancelled"].includes(status)) {
    params.push(status);
    where = `AND l.status = $${params.length}`;
  } else if (status) {
    throw new AppError("Invalid status filter", 400);
  }

  const result = await pool.query(
    `SELECT l.id, l.leave_type, l.start_date, l.end_date, l.days, l.reason,
            l.status, l.created_at, l.reviewed_at,
            u.id AS employee_id, u.name AS employee_name, u.email AS employee_email
     FROM leaves l
     JOIN employees u ON u.id = l.employee_id
     WHERE u.manager_id = $1 ${where}
     ORDER BY l.created_at DESC, l.id DESC`,
    params
  );
  return result.rows.map(mapRequest);
};

const mapRequest = (row) => ({
  id: row.id,
  employeeId: row.employee_id,
  employeeName: row.employee_name,
  employeeEmail: row.employee_email,
  leaveType: row.leave_type,
  startDate: row.start_date,
  endDate: row.end_date,
  days: row.days,
  reason: row.reason,
  status: row.status,
  createdAt: row.created_at,
  reviewedAt: row.reviewed_at,
});

export const getRequestDetails = async (managerId, requestId) => {
  const result = await pool.query(
    `SELECT l.id, l.leave_type, l.start_date, l.end_date, l.days, l.reason,
            l.status, l.created_at, l.updated_at, l.reviewed_at,
            u.id AS employee_id, u.name AS employee_name, u.email AS employee_email,
            b.earned_leave, b.sick_leave
     FROM leaves l
     JOIN employees u ON u.id = l.employee_id
     JOIN leave_balances b ON b.employee_id = u.id
     WHERE l.id = $1 AND u.manager_id = $2`,
    [requestId, managerId]
  );
  const row = result.rows[0];
  if (!row) throw new AppError("Request not found", 404);

  return {
    ...mapRequest(row),
    employeeBalances: { earnedLeave: row.earned_leave, sickLeave: row.sick_leave },
  };
};

export const listProcessed = async (managerId) => {
  const result = await pool.query(
    `SELECT l.id, l.leave_type, l.start_date, l.end_date, l.days, l.reason,
            l.status, l.created_at, l.reviewed_at,
            u.id AS employee_id, u.name AS employee_name, u.email AS employee_email
     FROM leaves l
     JOIN employees u ON u.id = l.employee_id
     WHERE u.manager_id = $1 AND l.status = ANY($2)
     ORDER BY l.reviewed_at DESC NULLS LAST, l.created_at DESC, l.id DESC`,
    [managerId, PROCESSED_STATUSES]
  );
  return result.rows.map(mapRequest);
};

export const approveRequest = async (managerId, requestId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const lock = await client.query(
      `SELECT l.id, l.employee_id, l.leave_type, l.days, l.status
       FROM leaves l
       JOIN employees u ON u.id = l.employee_id
       WHERE l.id = $1 AND u.manager_id = $2
       FOR UPDATE OF l`,
      [requestId, managerId]
    );

    const leave = lock.rows[0];
    if (!leave) throw new AppError("Request not found", 404);
    if (leave.status !== "pending") {
      throw new AppError(
        `Only pending requests can be approved (current status: ${leave.status})`,
        400
      );
    }

    // Lock the employee's balance row, then re-validate balance so the balance
    // can never drop below zero even with concurrent approvals.
    const balanceRow = await client.query(
      `SELECT earned_leave, sick_leave FROM leave_balances WHERE employee_id = $1 FOR UPDATE`,
      [leave.employee_id]
    );
    const balance = balanceRow.rows[0];
    if (!balance) throw new AppError("Leave balance not found", 404);

    const available =
      leave.leave_type === "earned" ? balance.earned_leave : balance.sick_leave;
    if (leave.days > available) {
      throw new AppError(
        `Cannot approve: insufficient ${leave.leave_type === "earned" ? "earned" : "sick"} leave balance (available ${available}, requested ${leave.days})`,
        400
      );
    }

    const updated = await client.query(
      `UPDATE leaves
       SET status = 'approved', reviewed_by = $1, reviewed_at = now(), updated_at = now()
       WHERE id = $2
       RETURNING id, leave_type, start_date, end_date, days, reason, status, reviewed_at`,
      [managerId, requestId]
    );

    const balanceUpdate =
      leave.leave_type === "earned"
        ? await client.query(
            "UPDATE leave_balances SET earned_leave = earned_leave - $1 WHERE employee_id = $2",
            [leave.days, leave.employee_id]
          )
        : await client.query(
            "UPDATE leave_balances SET sick_leave = sick_leave - $1 WHERE employee_id = $2",
            [leave.days, leave.employee_id]
          );

    await client.query("COMMIT");
    return { request: updated.rows[0], deductedDays: leave.days };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const rejectRequest = async (managerId, requestId) => {
  const result = await pool.query(
    `UPDATE leaves l
     SET status = 'rejected', reviewed_by = $1, reviewed_at = now(), updated_at = now()
     FROM employees u
     WHERE l.id = $2 AND u.id = l.employee_id AND u.manager_id = $1 AND l.status = 'pending'
     RETURNING l.id, l.leave_type, l.start_date, l.end_date, l.days, l.reason,
               l.status, l.reviewed_at`,
    [managerId, requestId]
  );

  if (result.rows.length === 0) {
    const existing = await pool.query(
      `SELECT l.status FROM leaves l
       JOIN employees u ON u.id = l.employee_id
       WHERE l.id = $1 AND u.manager_id = $2`,
      [requestId, managerId]
    );
    if (existing.rows.length === 0) {
      throw new AppError("Request not found", 404);
    }
    throw new AppError(
      `Only pending requests can be rejected (current status: ${existing.rows[0].status})`,
      400
    );
  }

  return { request: result.rows[0] };
};