# TESTING.md

## Server tests

Tests live in `server/tests` and use Node's built-in test runner
(`node:test`) + `supertest` against a real PostgreSQL instance. The schema is
re-created from `sql/schema.sql` before each suite, so the tests are fully
isolated.

### Requirements

- PostgreSQL reachable, with a dedicated empty database (default below)
- Nothing else — no compile step

### Configuration

The tests use the `TEST_DATABASE_URL` environment variable, defaulting to:

```
postgres://postgres:postgres@localhost:5432/leav_test
```

If the database cannot be reached, the suites **skip gracefully** (each test is
reported as skipped) rather than failing.

### Run

```powershell
cd C:\Leave\leav
npm test
npm --prefix server run test:watch
```

Example with a different test database:

```bash
$env:TEST_DATABASE_URL = "postgres://postgres:secret@localhost:5432/leav_test"
npm test
```

### What is covered

| File                 | Coverage |
| -------------------- | -------- |
| `tests/auth.test.js` | manager-only employee registration (team assignment, duplicate email, invalid payloads), login (success/failure), `/me` (auth token required) |
| `tests/leave.test.js`| initial balance, working-day counting, insufficient balance, overlapping requests, weekend-only ranges, invalid payloads, history listing, cancel pending only, role guard for managers |
| `tests/approval.test.js` | team-scoped visibility, request details + balance snapshot, approve deducts the correct balance, re-approve/re-reject blocked, reject leaves balance untouched, balance never goes negative, processed list excludes pending, role guard for employees |

### Layout

```
server/tests/
  helpers.js          # env setup, pool, schema reset, availability check
  auth.test.js
  leave.test.js
  approval.test.js
```

---

## Manual end-to-end check

1. Start PostgreSQL (see `docs/DATABASE.md`) and load schema + seed.
2. Open two terminals at `C:\Leave\leav`. Start the API in one and the
   frontend in the other:

   ```powershell
   npm run dev:server   # terminal 1, http://localhost:5000
   npm run dev          # terminal 2, http://localhost:5173
   ```

3. Log in as an employee (e.g. `ava@company.com` / `Password123`), apply for
   leave, verify the balance does not change, then cancel a pending request.
4. Log in as a manager (`sophia@company.com` / `Password123`), add an employee
   from **Manage Team**, then confirm the new employee can log in with the
   credentials created by the manager.
5. Approve a request and confirm the employee's balance drops by the
   working-day count.
6. Try to approve a second request once the balance is insufficient — expect a
   clear error and no deduction.

---

## Frontend checks

- `npm run build` — production build (type-checks imports/modules).
- `npm run lint` — ESLint (React hooks + refresh rules).

## Repository scripts

| Command              | Run from project root | Purpose                            |
| -------------------- | --------------------- | ---------------------------------- |
| `npm run db:setup`   | yes                   | Load `server/sql/schema.sql`       |
| `npm run db:seed`    | yes                   | Load `server/sql/seed.sql`         |
| `npm test`           | yes                   | Run API integration tests          |
| `npm run dev:server` | yes                   | Start API with auto-restart        |
| `npm run dev`        | yes                   | Start Vite frontend with API proxy |
| `npm run build`      | yes                   | Build frontend                     |
| `npm run lint`       | yes                   | Lint frontend                      |