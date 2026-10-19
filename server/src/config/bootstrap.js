import pool from "./db.js";

// Inlined copies of server/sql/schema.sql and server/sql/seed.sql so the
// Vercel serverless bundle always ships them (no filesystem reads).
// Keep in sync with the .sql files used by scripts/setupDb.js and scripts/seedDb.js.

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS managers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(150)  NOT NULL UNIQUE,
  password   VARCHAR(255)  NOT NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(150)  NOT NULL UNIQUE,
  password   VARCHAR(255)  NOT NULL,
  manager_id INTEGER REFERENCES managers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);

CREATE TABLE IF NOT EXISTS leave_balances (
  employee_id  INTEGER PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  earned_leave INTEGER NOT NULL DEFAULT 12 CHECK (earned_leave >= 0),
  sick_leave   INTEGER NOT NULL DEFAULT 10 CHECK (sick_leave >= 0)
);

CREATE TABLE IF NOT EXISTS leaves (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER     NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type  VARCHAR(20) NOT NULL CHECK (leave_type IN ('earned', 'sick')),
  start_date  DATE        NOT NULL,
  end_date    DATE        NOT NULL,
  days        INTEGER     NOT NULL CHECK (days > 0),
  reason      TEXT        NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by INTEGER REFERENCES managers(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT leaves_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_leaves_employee_id ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_overlap
  ON leaves(employee_id, status, start_date, end_date);
`;

const SEED_SQL = `
INSERT INTO managers (id, name, email, password) VALUES
  (1, 'Sophia Alvarez', 'sophia@company.com', '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy'),
  (2, 'Liam Benson',    'liam@company.com',   '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy'),
  (7, 'Maya Patel',     'maya@company.com',   '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy')
ON CONFLICT (email) DO NOTHING;

SELECT setval('managers_id_seq', (SELECT MAX(id) FROM managers));

INSERT INTO employees (id, name, email, password, manager_id) VALUES
  (3, 'Ava Carter',   'ava@company.com',    '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy', 1),
  (4, 'Noah Diaz',    'noah@company.com',   '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy', 1),
  (5, 'Emma Fischer', 'emma@company.com',   '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy', 1),
  (6, 'Olivia Grant', 'olivia@company.com', '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy', 2),
  (8, 'Zoe Martin',   'zoe@company.com',    '$2a$10$c2uu3G4kDK0Sl4x.IZBSjux8UlnSMv4aULJHJi7uPteUt/AKf6NLy', 7)
ON CONFLICT (email) DO NOTHING;

SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees));

INSERT INTO leave_balances (employee_id, earned_leave, sick_leave) VALUES
  (3, 9,  10),
  (4, 12, 7),
  (5, 10, 10),
  (6, 12, 10),
  (8, 12, 10)
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO leaves (id, employee_id, leave_type, start_date, end_date, days, reason, status, reviewed_by, reviewed_at) VALUES
  (1, 3, 'earned', '2026-06-08', '2026-06-10', 3, 'Family trip',             'approved', 1, '2026-05-20T10:00:00Z'),
  (2, 4, 'sick',   '2026-05-12', '2026-05-14', 3, 'Flu recovery',            'approved', 1, '2026-05-15T09:30:00Z'),
  (3, 5, 'earned', '2026-06-15', '2026-06-16', 2, 'Wedding attendance',      'approved', 1, '2026-06-01T14:00:00Z'),
  (4, 5, 'sick',   '2026-04-06', '2026-04-07', 2, 'Migraine',                'rejected', 1, '2026-04-03T11:00:00Z'),
  (5, 3, 'earned', '2026-03-09', '2026-03-10', 2, 'Banking appointment',     'cancelled', NULL, NULL),
  (6, 3, 'sick',   '2026-11-02', '2026-11-04', 3, 'Planned surgery follow-up', 'pending', NULL, NULL),
  (7, 4, 'earned', '2026-12-07', '2026-12-11', 5, 'Holiday with family',     'pending', NULL, NULL),
  (8, 8, 'earned', '2026-12-14', '2026-12-15', 2, 'Family visit',            'pending', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval('leaves_id_seq', (SELECT MAX(id) FROM leaves));
`;

let ready = false;
let pending = null;

// Creates the schema and demo data on demand so a fresh (empty) database
// works without running db:setup/db:seed manually. Skipped during tests,
// which reset the schema themselves.
export const ensureDatabase = async () => {
  if (ready || process.env.NODE_ENV === "test") return;

  if (!pending) {
    pending = (async () => {
      const schema = await pool.query(
        "SELECT to_regclass('public.managers') AS managers_table"
      );
      if (!schema.rows[0].managers_table) {
        await pool.query(SCHEMA_SQL);
      }

      const counts = await pool.query(
        "SELECT (SELECT COUNT(*) FROM managers) AS managers, " +
          "(SELECT COUNT(*) FROM employees) AS employees"
      );
      const { managers, employees } = counts.rows[0];
      if (Number(managers) === 0 && Number(employees) === 0) {
        await pool.query(SEED_SQL);
      }

      ready = true;
    })().catch((err) => {
      pending = null;
      throw err;
    });
  }

  return pending;
};
