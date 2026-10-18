import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/leav",
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error", err);
});

export default pool;