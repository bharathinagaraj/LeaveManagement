import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool, types } = pg;

// A Postgres DATE has no timezone. node-postgres would parse it into a JS Date
// at *local* midnight, which shifts the calendar day once the value is
// serialized to JSON (e.g. 2026-06-08 becomes 2026-06-07T18:30:00.000Z in UTC+05:30).
// Keep DATE columns as plain YYYY-MM-DD strings so the API always returns the
// exact calendar date that is stored in the database.
types.setTypeParser(types.builtins.DATE, (value) => value);

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/leav";

const isLocalhost = /@(localhost|127\.0\.0\.1)(:\d+)?([/?]|$)/.test(
  connectionString
);
const sslDisabled = connectionString.includes("sslmode=disable");

const pool = new Pool({
  connectionString,
  ...(isLocalhost || sslDisabled
    ? {}
    : { ssl: { rejectUnauthorized: false } }),
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error", err);
});

export default pool;
