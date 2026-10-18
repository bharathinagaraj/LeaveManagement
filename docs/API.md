# API.md

Base URL: `/api` on the Express server (`http://localhost:5000` in dev).

All endpoints except `/auth/login/*` and `/health` require a `Bearer` token:

```
Authorization: Bearer <token>
```

Errors are returned as JSON with an `error` field:

```json
{ "error": "Human readable message" }
```

Common status codes:

| Code | Meaning                                          |
| ---- | ------------------------------------------------ |
| 400  | Validation failed (bad dates, overlap, insufficient balance, wrong status transition) |
| 401  | Missing / invalid / expired token, bad credentials |
| 403  | Authenticated user does not have the required role |
| 404  | Resource not found (or not in the manager's team) |
| 409  | Conflict (duplicate email)                        |
| 500  | Server error                                      |

---

## Auth

### POST /api/auth/register

Creates an **employee** account with the full opening balance. This endpoint
requires a manager token and always assigns the employee to the authenticated
manager. The request cannot choose a different manager.

```json
{
  "name": "New Employee",
  "email": "new@company.com",
  "password": "secret123"
}
```

`201` → `{ "user": { id, name, email, role: "employee", manager_id } }`

### POST /api/auth/login/employee · POST /api/auth/login/manager

Employees and managers live in separate tables, so each has its own login
endpoint. Credentials only match the table for the endpoint used (an employee
email cannot sign in through `/login/manager`, and vice versa).
`POST /api/auth/login` with `"role": "employee" | "manager"` in the body is
equivalent. An unknown role returns `400`.

```json
{ "email": "ava@company.com", "password": "Password123" }
```

`200` → `{ "user": { id, name, email, role, manager_id? }, "token": "<jwt>" }`
(`manager_id` is present for employees only.)

### GET /api/auth/me

`200` → `{ "user": { ... } }`

---

## Employee leave endpoints (role: employee)

### GET /api/leaves/balance

`200` → `{ "earnedLeave": 12, "sickLeave": 10 }`

### POST /api/leaves

Body:

```json
{
  "leaveType": "earned | sick",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "reason": "Family trip"
}
```

Rules enforced:

- valid ISO dates, `startDate <= endDate`
- at least one working day in the range (weekends excluded)
- balance must be sufficient (deduction happens later, on approval)
- no overlap with an existing `pending` or `approved` request

`201` → `{ "leave": { id, leaveType, startDate, endDate, days, reason, status, createdAt } }`
with `status: "pending"`.

### GET /api/leaves/mine

`200` → `{ "leaves": [...] }` ordered newest first.

### DELETE /api/leaves/:id

Cancels a **pending** request owned by the caller.

`200` → `{ "leave": { ..., status: "cancelled" } }`
`400` if the request is not pending, `404` if not found.

---

## Manager endpoints (role: manager)

A manager only sees requests from employees whose `manager_id` matches their
own user id.

### GET /api/manager/employees

Lists only employees assigned to the authenticated manager.

`200` → `{ "employees": [ { id, name, email, role, manager_id, created_at } ] }`

### POST /api/manager/employees

Creates an employee with the authenticated manager assigned as their manager
and initializes the standard leave balance. The submitted body cannot choose
or override the manager assignment.

```json
{
  "name": "New Employee",
  "email": "new@company.com",
  "password": "secret123"
}
```

`201` → `{ "employee": { id, name, email, role, manager_id } }`
`409` if the email is already registered.

### GET /api/manager/requests?status=pending

`status` is optional (`pending` | `approved` | `rejected` | `cancelled`).

`200` → `{ "requests": [ { id, employeeId, employeeName, employeeEmail, leaveType, startDate, endDate, days, reason, status, createdAt, reviewedAt } ] }`

### GET /api/manager/requests/processed

`200` → requests with status `approved` or `rejected` (what this manager has handled).

### GET /api/manager/requests/:id

`200` → `{ "request": { ...details..., "employeeBalances": { earnedLeave, sickLeave } } }`
`404` if the request does not exist or is outside this manager's team.

### PUT /api/manager/requests/:id/approve

Approves a `pending` request **and deducts the working days** from the
employee's balance in the same transaction.

`200` → `{ "request": { ..., status: "approved" }, "deductedDays": 5 }`
`400` if not pending, or if approving would exceed the employee's balance.

### PUT /api/manager/requests/:id/reject

Rejects a `pending` request without touching the balance.

`200` → `{ "request": { ..., status: "rejected" } }`
`400` if not pending.

---

## Health

### GET /api/health

Checks connectivity to PostgreSQL.

`200` → `{ "status": "ok", "database": "connected" }`
`500` → `{ "error": "Actionable database setup or connection error" }`