# Leave Management System

A full-stack leave/absence management application.

- **Employee** – log in, view leave balance, apply for leave (type, dates,
  reason), track request history, cancel pending requests.
- **Manager** – manage their own employee team, review leave requests, approve
  or reject, and browse previously processed requests.

## Feature checklist

- [x] Login / JWT authentication
- [x] Separate **Employee** and **Manager** roles (multiple managers supported)
- [x] Leave balance per type (Earned 12 + Sick 10 = 22 days/year)
- [x] Working-day counting (Mon–Fri, public holidays ignored)
- [x] Balance reduces **only after approval**
- [x] Rejected / cancelled requests never touch the balance
- [x] Negative balances prevented (validated at apply-time and approval-time,
      with row-level transaction locking)
- [x] Overlapping `pending`/`approved` requests blocked
- [x] Statuses: `pending`, `approved`, `rejected`, `cancelled`
- [x] Cancellation limited to pending requests
- [x] Manager scopes requests to their own team
- [x] Managers can add employees to their own teams; manager accounts remain
      administrator-managed
- [x] Automated API integration tests

## Technology choices

| Concern      | Choice                              | Why |
| ------------ | ----------------------------------- | --- |
| Frontend     | **React 19 + Vite**                 | Component model fits the UI; Vite gives instant HMR and a fast build. |
| UI library   | **Tailwind CSS + shadcn/ui**        | Tailwind keeps styling consistent with utility classes; shadcn/ui provides accessible, copy-ownable components (builds on Radix primitives, CVA variants). |
| Backend      | **Node.js + Express**               | Same language across the stack (JS), lightweight, plenty of middleware. |
| Database     | **PostgreSQL**                      | Robust relational DB with transactions and row locks, perfect for balance updates and overlap checks. |
| ORM / driver | `pg` (node-postgres) + plain SQL    | Keeps SQL explicit and portable; the fixed leave policy is easy to express in plain queries. |
| Auth         | **jsonwebtoken + bcryptjs**         | Stateless Bearer tokens; bcrypt password hashing. |
| Tests        | Node `node:test` + `supertest`      | Zero extra runners; real HTTP integration tests against PostgreSQL. |

## Project structure

```
├── client/            React SPA (Vite + Tailwind + shadcn/ui)
│   ├── src/components/{ui,common,layout,employee,manager}
│   ├── src/pages/{employee,manager}
│   ├── src/{services,context,routes,utils}
│   └── ...
├── server/            Express API
│   ├── src/{config,middleware,routes,controllers,services,utils}
│   ├── sql/{schema.sql,seed.sql}
│   ├── tests/{auth,leave,approval}.test.js
│   └── scripts/{setupDb,seedDb}.js
├── docs/              API.md, DATABASE.md, TESTING.md
├── docker-compose.yml PostgreSQL for local/CI
└── README.md
```

## Quick start

Prerequisites: Node.js ≥ 18. On Windows, install
[winget](https://learn.microsoft.com/windows/package-manager/winget/) and allow
the PostgreSQL installer to request administrator approval on first launch.

From the project folder (`C:\Leave\leav`), install the app dependencies and start the full development stack:

```powershell
npm run setup
npm run dev
```

On Windows, `npm run dev` installs PostgreSQL 16 if it is not already present,
starts its Windows service, creates the `leav` database, applies the schema and
demo data, then starts both the API and frontend. PostgreSQL uses the local
development credentials in `server/.env.example`. The first install may show a
Windows administrator approval prompt. Press Ctrl+C to stop the API and
frontend; the PostgreSQL service remains available for the next run.

Open http://localhost:5173 to use the app. Vite proxies `/api/*` to the API on
port 5000. On non-Windows systems, start PostgreSQL yourself (or use
`docker compose up -d`) before `npm run dev`.

For separate terminals or an existing PostgreSQL installation, `npm run
dev:server` and `npm run dev:client` are still available. Configure
`server/.env` first if your PostgreSQL connection differs from the local
development defaults.

## Demo accounts

Every account uses the password **`Password123`**.
The seed command can be rerun to add newly added demo accounts without
replacing existing user records.

| Role     | Email                 |
| -------- | --------------------- |
| Manager  | `sophia@company.com`  |
| Manager  | `liam@company.com`    |
| Manager  | `maya@company.com`    |
| Employee | `ava@company.com`     |
| Employee | `noah@company.com`    |
| Employee | `emma@company.com`    |
| Employee | `olivia@company.com`  |
| Employee | `zoe@company.com`     |

Login sessions are stored per browser tab. To use a manager and an employee
account at the same time, open the app in two separate tabs and sign in to each
account independently. Refreshing a tab keeps its session; closing the tab ends
it.

If login reports a database error, open `http://localhost:5000/api/health`.
It checks PostgreSQL and returns a specific setup error. On Windows, restart
the full stack with `npm run dev`; setup and seeding run automatically. The
demo employee and manager accounts use the password shown above. Managers can
add employees from **Manage Team** after signing in; manager accounts are
created by the administrator through the database seed/setup process.

## Environment variables

- `server/.env` – `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`
- `client/.env` – `VITE_API_URL` (leave empty in dev to use the Vite proxy; if
  set, include the `/api` path, for example `https://api.example.com/api`)

See `server/.env.example` and `client/.env.example`.

## Tests & verification

```bash
npm test        # API integration tests (skip if DB unreachable)
npm run build   # production build
npm run lint    # ESLint
```

See [docs/TESTING.md](docs/TESTING.md) for details, [docs/API.md](docs/API.md)
for the API reference, and [docs/DATABASE.md](docs/DATABASE.md) for the schema
and leave-policy implementation details.