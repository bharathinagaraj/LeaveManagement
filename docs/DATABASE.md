# DATABASE.md

The application uses **PostgreSQL**. All schema objects are defined in
`server/sql/schema.sql` and sample data is in `server/sql/seed.sql`.

## Quick start

On Windows, the root development command installs PostgreSQL 16 with winget
when needed, starts its service, and then initializes the application database:

```sh
npm run dev
```

The first-time installer may request administrator approval. The default local
development connection uses database `leav`, user `postgres`, password
`postgres`, and port `5432`; do not use these credentials in production.

Alternatively, use Docker Compose or an existing PostgreSQL installation:

```powershell
docker compose up -d
npm run db:setup
npm run db:seed
```

The test suite uses a separate `leav_test` database; create it if you want to
run integration tests against PostgreSQL.

## Running the schema and seed

From the repository root, run:

```powershell
cd C:\Leave\leav
npm run db:setup
npm run db:seed
```

These scripts load `server/.env` when present or default to
`postgres://postgres:postgres@localhost:5432/leav`. `db:setup` creates the
database named in `DATABASE_URL` when it is missing (the configured PostgreSQL
user must have permission to create databases), then applies the schema.

`db:setup` is idempotent (`CREATE TABLE IF NOT EXISTS`); `db:seed` inserts
demo data. Check `http://localhost:5000/api/health` after starting the API to
verify that it can connect to PostgreSQL.

## Upgrading from the single `users` table

Earlier versions stored everyone in one `users` table. To move to the separate
`managers` / `employees` tables (this **deletes all existing data**):

```powershell
npm run db:reset
npm run db:setup
npm run db:seed
```

## Schema overview

### managers

| Column     | Type        | Notes                |
| ---------- | ----------- | -------------------- |
| id         | SERIAL PK   |                      |
| name       | VARCHAR     |                      |
| email      | VARCHAR     | UNIQUE               |
| password   | VARCHAR     | bcrypt hash          |
| created_at | TIMESTAMPTZ |                      |

### employees

| Column     | Type        | Notes                                              |
| ---------- | ----------- | -------------------------------------------------- |
| id         | SERIAL PK   |                                                    |
| name       | VARCHAR     |                                                    |
| email      | VARCHAR     | UNIQUE                                             |
| password   | VARCHAR     | bcrypt hash                                        |
| manager_id | INTEGER     | FK -> managers.id; which manager the employee reports to |
| created_at | TIMESTAMPTZ |                                                    |

Managers and employees are separate tables with separate logins. Managers can
be many; each manager only sees requests submitted by employees whose
`manager_id` points to them.

### leave_balances

| Column       | Type    | Notes                                        |
| ------------ | ------- | -------------------------------------------- |
| employee_id  | INTEGER | PK, FK -> employees.id                       |
| earned_leave | INTEGER | Default 12, `CHECK >= 0`                     |
| sick_leave   | INTEGER | Default 10, `CHECK >= 0`                     |

Every employee starts at the full annual entitlement (12 + 10 = 22).

### leaves

| Column      | Type        | Notes                                        |
| ----------- | ----------- | -------------------------------------------- |
| id          | SERIAL PK   |                                              |
| employee_id | INTEGER     | FK -> employees.id                           |
| leave_type  | VARCHAR     | `earned` or `sick`                           |
| start_date  | DATE        |                                              |
| end_date    | DATE        | `CHECK (end_date >= start_date)`             |
| days        | INTEGER     | Working days, `CHECK (days > 0)`             |
| reason      | TEXT        |                                              |
| status      | VARCHAR     | `pending` / `approved` / `rejected` / `cancelled` |
| reviewed_by | INTEGER     | FK -> managers.id (the reviewing manager)   |
| reviewed_at | TIMESTAMPTZ |                                              |
| created_at  | TIMESTAMPTZ |                                              |
| updated_at  | TIMESTAMPTZ |                                              |

## Leave policy implementation

- **Fixed entitlements** – 12 earned / 10 sick days, set as defaults on
  `leave_balances`.
- **Working days** – `days` is computed as the number of Mon–Fri dates in the
  range (see `server/src/utils/dateUtils.js`). Public holidays are ignored and
  weekends are excluded.
- **Balance reduces only on approval** – the `approve` flow deducts `days`
  from `leave_balances` inside the same transaction as the status update
  (`ROW FOR UPDATE` on the balance row prevents races and ensures the balance
  can never go negative).
- **Rejected / cancelled** – do not touch `leave_balances`.
- **Overlap prevention** – a new request is rejected if any `pending` or
  `approved` request already overlaps it (checked inside a transaction that
  locks the employee's balance row).
- **No accrual / carry-forward / encashment** – balances are static annual
  numbers.

## Seed data

`sql/seed.sql` creates 3 managers, 5 employees, their leave balances and a
selection of leave requests covering every status. Every seeded account uses
the password `Password123`. See `README.md` for demo logins.