import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

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
