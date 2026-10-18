-- Leave Management System — schema
-- Run with: psql -U postgres -d leav -f schema.sql

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