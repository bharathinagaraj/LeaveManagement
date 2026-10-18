import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/leav",
});

try {
  const filePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "sql",
    "seed.sql"
  );
  const sql = await readFile(filePath, "utf8");
  await pool.query(sql);
  console.log("Seed data applied");
  await pool.end();
} catch (err) {
  const detail =
    err.code === "ECONNREFUSED" || err.code === "ECONNRESET"
      ? "PostgreSQL is not accepting connections. Start the PostgreSQL service and check DATABASE_URL in server/.env."
      : err.message;
  console.error("Seeding failed:", detail);
  await pool.end();
  process.exit(1);
}