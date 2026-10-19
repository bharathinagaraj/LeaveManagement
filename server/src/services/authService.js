import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwt.js";
import { AppError } from "../utils/errors.js";

// Managers and employees live in separate tables and log in separately.
export const ROLES = ["employee", "manager"];
const TABLES = { employee: "employees", manager: "managers" };

export const sanitizeUser = (user, role) => {
  if (!user) return null;
  const { password, ...safe } = user;
  return { ...safe, role };
};

export const generateToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

export const registerUser = async ({ name, email, password, managerId }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const trimmedName = String(name || "").trim();

  if (!trimmedName) throw new AppError("Name is required", 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    throw new AppError("A valid email is required", 400);
  }
  if (!password || password.length < 6) {
    throw new AppError("Password must be at least 6 characters long", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM employees WHERE email = $1",
      [normalizedEmail]
    );
    if (existing.rows.length > 0) {
      throw new AppError("Email is already registered", 409);
    }

    let managerIdFinal = null;
    if (managerId) {
      const manager = await client.query(
        "SELECT id FROM managers WHERE id = $1",
        [Number(managerId)]
      );
      if (manager.rows.length === 0) {
        throw new AppError("Assigned manager does not exist", 400);
      }
      managerIdFinal = manager.rows[0].id;
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await client.query(
      `INSERT INTO employees (name, email, password, manager_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, manager_id`,
      [trimmedName, normalizedEmail, hashed, managerIdFinal]
    );

    await client.query(
      "INSERT INTO leave_balances (employee_id, earned_leave, sick_leave) VALUES ($1, 12, 10)",
      [result.rows[0].id]
    );

    await client.query("COMMIT");
    return sanitizeUser(result.rows[0], "employee");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const assertRole = (role) => {
  if (!ROLES.includes(role)) {
    throw new AppError("Role must be 'employee' or 'manager'", 400);
  }
};

const USER_COLUMNS = {
  employee: "id, name, email, manager_id",
  manager: "id, name, email",
};

export const loginUser = async ({ email, password, role }) => {
  assertRole(role);
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const result = await pool.query(
    `SELECT ${USER_COLUMNS[role]}, password FROM ${TABLES[role]} WHERE email = $1`,
    [normalizedEmail]
  );

  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(String(password || ""), user.password))) {
    throw new AppError("Invalid email or password", 401);
  }

  const safeUser = sanitizeUser(user, role);
  return { user: safeUser, token: generateToken(safeUser) };
};

export const getUserById = async (id, role) => {
  if (!ROLES.includes(role)) return null;
  const result = await pool.query(
    `SELECT ${USER_COLUMNS[role]} FROM ${TABLES[role]} WHERE id = $1`,
    [id]
  );
  return sanitizeUser(result.rows[0], role);
};

export const listManagedEmployees = async (managerId) => {
  const result = await pool.query(
    `SELECT id, name, email, manager_id, created_at
     FROM employees
     WHERE manager_id = $1
     ORDER BY name, id`,
    [managerId]
  );
  return result.rows.map((row) => ({ ...row, role: "employee" }));
};