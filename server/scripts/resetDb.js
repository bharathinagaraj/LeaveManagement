import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

// Drops every application table (including the legacy single `users` table) so
// `npm run db:setup` + `npm run db:seed` can rebuild the separate
// managers/employees schema. This DELETES ALL DATA in the configured database.
const { Pool } = pg;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/leav",
});

try {
  await pool.query(
    "DROP TABLE IF EXISTS leaves, leave_balances, employees, managers, users CASCADE"
  );
  console.log("Dropped existing tables. Now run: npm run db:setup && npm run db:seed");
} catch (err) {
  console.error("Reset failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
