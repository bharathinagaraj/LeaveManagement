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

const runSqlFile = async (file) => {
  const filePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "sql",
    file
  );
  const sql = await readFile(filePath, "utf8");
  await pool.query(sql);
  console.log(`Applied ${file}`);
};

const hasLegacySchema = async () => {
  const result = await pool.query(`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS has_users,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'leaves' AND column_name = 'user_id'
      ) AS has_legacy_leaves
  `);
  return result.rows[0].has_users || result.rows[0].has_legacy_leaves;
};

let adminPool;

try {
  const databaseUrl = new URL(pool.options.connectionString);
  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
  if (!databaseName) {
    throw new Error("DATABASE_URL must include a database name");
  }

  if (databaseName !== "postgres") {
    databaseUrl.pathname = "/postgres";
    adminPool = new Pool({ connectionString: databaseUrl.toString() });
    const existing = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName]
    );

    if (existing.rowCount === 0) {
      const quotedName = `"${databaseName.replaceAll('"', '""')}"`;
      await adminPool.query(`CREATE DATABASE ${quotedName}`);
      console.log(`Created database ${databaseName}`);
    }

    await adminPool.end();
    adminPool = null;
  }

  if (await hasLegacySchema()) {
    console.log(
      "Detected legacy schema (single users table). Rebuilding with managers/employees tables..."
    );
    await pool.query(
      "DROP TABLE IF EXISTS leaves, leave_balances, employees, managers, users CASCADE"
    );
  }

  await runSqlFile("schema.sql");
} catch (err) {
  const detail =
    err.code === "ECONNREFUSED" || err.code === "ECONNRESET"
      ? "PostgreSQL is not accepting connections. Start the PostgreSQL service and check DATABASE_URL in server/.env."
      : err.message;
  console.error("Database setup failed:", detail);
  process.exitCode = 1;
} finally {
  await Promise.all(
    [adminPool, pool]
      .filter(Boolean)
      .map((activePool) =>
        activePool.end().catch((err) => {
          console.error("Failed to close PostgreSQL connection:", err.message);
        })
      )
  );
}