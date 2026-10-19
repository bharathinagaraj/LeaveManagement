import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";

// helpers must be imported before the app so it can point DATABASE_URL at the test database
const helpers = await import("./helpers.js");
const { default: app } = await import("../src/app.js");

async function register(role, managerId = null) {
  const passwordHash = await bcrypt.hash(helpers.demoPassword, 10);
  if (role === "manager") {
    const result = await helpers.pool.query(
      `INSERT INTO managers (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [role, helpers.uniqueEmail(role), passwordHash]
    );
    return { ...result.rows[0], role };
  }
  const result = await helpers.pool.query(
    `INSERT INTO employees (name, email, password, manager_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, manager_id`,
    [role, helpers.uniqueEmail(role), passwordHash, managerId]
  );
  const user = { ...result.rows[0], role };
  await helpers.pool.query(
    "INSERT INTO leave_balances (employee_id, earned_leave, sick_leave) VALUES ($1, 12, 10)",
    [user.id]
  );
  return user;
}

async function login(user) {
  const res = await request(app).post(`/api/auth/login/${user.role}`).send({ email: user.email, password: helpers.demoPassword });
  return res.body.token;
}

function leaveBody({ startDate, endDate, leaveType = "earned", reason = "reason" }) {
  return { startDate, endDate, leaveType, reason };
}

// 2026-02-02 (Mon) .. 2026-02-04 (Wed) = 3 working days
const THREE = { startDate: "2026-02-02", endDate: "2026-02-04" };
// 2026-02-09 (Mon) .. 2026-02-13 (Fri) = 5 working days
const FIVE = { startDate: "2026-02-09", endDate: "2026-02-13" };
// 2026-02-16 (Mon) .. 2026-02-19 (Thu) = 4 working days
const FOUR = { startDate: "2026-02-16", endDate: "2026-02-19" };

describe("Manager approval API", () => {
  let manager;
  let managerToken;
  let otherManager;
  let otherManagerToken;

before(async () => {
    await helpers.initDb();
    if (!helpers.dbAvailable) return;

    manager = await register("manager");
    managerToken = await login(manager);

    // A manager that should NOT see the first team's requests
    otherManager = await register("manager");
    otherManagerToken = await login(otherManager);

    // Two employees under `manager`
    const empA = await register("employee", manager.id);
    const empB = await register("employee", manager.id);
    const empOther = await register("employee", otherManager.id);
    // Avoid unused warnings while keeping references for future helpers
    void empA; void empB; void empOther;
  });

  after(async () => {
    if (helpers.dbAvailable) await helpers.pool.end();
  });

  it("shows a manager only their team's pending requests", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const empA = await register("employee", manager.id);
    await request(app).post("/api/leaves").set("Authorization", `Bearer ${await login(empA)}`).send(leaveBody(THREE));

    const res = await request(app).get("/api/manager/requests?status=pending").set("Authorization", `Bearer ${managerToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.requests.length, 1);
    assert.equal(res.body.requests[0].days, 3);
    assert.equal(res.body.requests[0].employeeId, empA.id);

    const outsider = await request(app).get("/api/manager/requests").set("Authorization", `Bearer ${otherManagerToken}`);
    assert.equal(outsider.body.requests.length, 0);
  });

  it("returns details with the employee balance snapshot", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const empA = await register("employee", manager.id);
    const created = await request(app).post("/api/leaves").set("Authorization", `Bearer ${await login(empA)}`).send(leaveBody(FIVE));
    const id = created.body.leave.id;

    const res = await request(app).get(`/api/manager/requests/${id}`).set("Authorization", `Bearer ${managerToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.request.employeeId, empA.id);
    assert.deepEqual(res.body.request.employeeBalances, { earnedLeave: 12, sickLeave: 10 });

    const forbidden = await request(app).get(`/api/manager/requests/${id}`).set("Authorization", `Bearer ${otherManagerToken}`);
    assert.equal(forbidden.status, 404);
  });

  it("approves a request and deducts from the correct balance", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const empA = await register("employee", manager.id);
    const token = await login(empA);

    const sick = await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send(leaveBody({ ...FIVE, leaveType: "sick" }));
    const approveSick = await request(app).put(`/api/manager/requests/${sick.body.leave.id}/approve`).set("Authorization", `Bearer ${managerToken}`);
    assert.equal(approveSick.status, 200);
    assert.equal(approveSick.body.request.status, "approved");
    assert.equal(approveSick.body.deductedDays, 5);

    const bal = await request(app).get("/api/leaves/balance").set("Authorization", `Bearer ${token}`);
    assert.equal(bal.body.earnedLeave, 12, "earned untouched");
    assert.equal(bal.body.sickLeave, 5, "5 deducted from sick");

    // Approving again must fail: it is no longer pending
    const again = await request(app).put(`/api/manager/requests/${sick.body.leave.id}/approve`).set("Authorization", `Bearer ${managerToken}`);
    assert.equal(again.status, 400);
  });

  it("rejects a request without touching the balance", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const empA = await register("employee", manager.id);
    const token = await login(empA);

    const created = await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send(leaveBody(THREE));
    const before = await request(app).get("/api/leaves/balance").set("Authorization", `Bearer ${token}`);

    const reject = await request(app).put(`/api/manager/requests/${created.body.leave.id}/reject`).set("Authorization", `Bearer ${managerToken}`);
    assert.equal(reject.status, 200);
    assert.equal(reject.body.request.status, "rejected");

    const after = await request(app).get("/api/leaves/balance").set("Authorization", `Bearer ${token}`);
    assert.deepEqual(after.body, before.body, "balance unchanged");

    // Rejecting twice must fail (no longer pending)
    const again = await request(app).put(`/api/manager/requests/${created.body.leave.id}/reject`).set("Authorization", `Bearer ${managerToken}`);
    assert.equal(again.status, 400);
  });

  it("never allows the balance to go negative", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const empA = await register("employee", manager.id);
    const token = await login(empA);

    // 10 sick days requested, request A of 5 then B of 6 — after A, only 5 remain
    const a = await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send(leaveBody({ ...FIVE, leaveType: "sick" }));
    const b = await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send(leaveBody({ ...FOUR, startDate: "2026-03-02", endDate: "2026-03-09", leaveType: "sick" }));

    await request(app).put(`/api/manager/requests/${a.body.leave.id}/approve`).set("Authorization", `Bearer ${managerToken}`);

    const approveB = await request(app).put(`/api/manager/requests/${b.body.leave.id}/approve`).set("Authorization", `Bearer ${managerToken}`);
    assert.equal(approveB.status, 400);
    assert.match(approveB.body.error, /insufficient/i);

    const bal = await request(app).get("/api/leaves/balance").set("Authorization", `Bearer ${token}`);
    assert.equal(bal.body.sickLeave, 5);

    // B remains pending and can be rejected later
    const rejectB = await request(app).put(`/api/manager/requests/${b.body.leave.id}/reject`).set("Authorization", `Bearer ${managerToken}`);
    assert.equal(rejectB.status, 200);
  });

  it("lists processed requests (approved + rejected) without pending", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const empA = await register("employee", manager.id);
    const token = await login(empA);

    const approved = await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send(leaveBody(THREE));
    const rejected = await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send(leaveBody(FOUR));
    const pending = await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send(leaveBody({ startDate: "2026-04-06", endDate: "2026-04-08", leaveType: "sick" }));

    await request(app).put(`/api/manager/requests/${approved.body.leave.id}/approve`).set("Authorization", `Bearer ${managerToken}`);
    await request(app).put(`/api/manager/requests/${rejected.body.leave.id}/reject`).set("Authorization", `Bearer ${managerToken}`);

    const res = await request(app).get("/api/manager/requests/processed").set("Authorization", `Bearer ${managerToken}`);
    assert.equal(res.status, 200);

    const ids = res.body.requests.map((r) => r.id);
    assert.ok(ids.includes(approved.body.leave.id));
    assert.ok(ids.includes(rejected.body.leave.id));
    assert.ok(!ids.includes(pending.body.leave.id));
  });

  it("blocks employees from manager endpoints", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const emp = await register("employee", manager.id);
    const res = await request(app).get("/api/manager/requests").set("Authorization", `Bearer ${await login(emp)}`);
    assert.equal(res.status, 403);
  });

  it("lets managers add employees only to their own team", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const email = helpers.uniqueEmail("managed");
    const created = await request(app)
      .post("/api/manager/employees")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ name: "Managed Employee", email, password: helpers.demoPassword });
    assert.equal(created.status, 201);
    assert.equal(created.body.employee.role, "employee");
    assert.equal(created.body.employee.manager_id, manager.id);
    assert.ok(!("password" in created.body.employee));

    const ownTeam = await request(app)
      .get("/api/manager/employees")
      .set("Authorization", `Bearer ${managerToken}`);
    assert.equal(ownTeam.status, 200);
    assert.ok(ownTeam.body.employees.some((employee) => employee.email === email));

    const otherTeam = await request(app)
      .get("/api/manager/employees")
      .set("Authorization", `Bearer ${otherManagerToken}`);
    assert.equal(otherTeam.status, 200);
    assert.ok(!otherTeam.body.employees.some((employee) => employee.email === email));

    const denied = await request(app)
      .post("/api/manager/employees")
      .set("Authorization", `Bearer ${await login(await register("employee", manager.id))}`)
      .send({ name: "Unauthorized", email: helpers.uniqueEmail("unauthorized"), password: helpers.demoPassword });
    assert.equal(denied.status, 403);
  });
});
