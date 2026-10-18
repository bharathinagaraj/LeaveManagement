import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/leav_test";
process.env.JWT_SECRET = "test-secret";
process.env.NODE_ENV = "test";

const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on("error", () => {});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaSql = await readFile(path.join(__dirname, "../sql/schema.sql"), "utf8");

export let dbAvailable = true;

export async function checkDb() {
  try {
    await pool.query("SELECT 1");
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
}

export async function resetDb() {
  await pool.query("DROP TABLE IF EXISTS leaves, leave_balances, employees, managers, users CASCADE");
  await pool.query(schemaSql);
}

/**
 * Verifies the database is reachable and, if so, resets the schema.
 * Returns true only when a usable database is available.
 */
export async function initDb() {
  await checkDb();
  if (dbAvailable) await resetDb();
  return dbAvailable;
}

let counter = 0;
export function uniqueEmail(prefix) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@test.dev`;
}

export const demoPassword = "Password123";