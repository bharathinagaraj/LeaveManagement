import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";

// helpers must be imported before the app so it can point DATABASE_URL at the test database
const helpers = await import("./helpers.js");
const { default: app } = await import("../src/app.js");

async function registerAndLogin(role = "employee", managerId = null) {
  const email = helpers.uniqueEmail(role);
  const name = role === "employee" ? "Employee" : "Manager";
  const passwordHash = await bcrypt.hash(helpers.demoPassword, 10);
  if (role === "employee") {
    const created = await helpers.pool.query(
      `INSERT INTO employees (name, email, password, manager_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name, email, passwordHash, managerId]
    );
    await helpers.pool.query(
      "INSERT INTO leave_balances (employee_id, earned_leave, sick_leave) VALUES ($1, 12, 10)",
      [created.rows[0].id]
    );
  } else {
    await helpers.pool.query(
      "INSERT INTO managers (name, email, password) VALUES ($1, $2, $3)",
      [name, email, passwordHash]
    );
  }
  const login = await request(app).post(`/api/auth/login/${role}`).send({ email, password: helpers.demoPassword });
  return { token: login.body.token, user: login.body.user };
}

const MON_WED = { startDate: "2026-02-02", endDate: "2026-02-04" }; // 3 working days
const MON_FRI = { startDate: "2026-02-02", endDate: "2026-02-06" }; // 5 working days

describe("Leave API (employee)", () => {
  before(async () => {
    await helpers.initDb();
  });

  after(async () => {
    if (helpers.dbAvailable) await helpers.pool.end();
  });

  it("returns initial balances for a new employee", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");
    const { token } = await registerAndLogin();

    const res = await request(app).get("/api/leaves/balance").set("Authorization", `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { earnedLeave: 12, sickLeave: 10 });
  });

  it("creates a leave request and counts only working days", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post("/api/leaves")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...MON_WED, leaveType: "earned", reason: "Family trip" });

    assert.equal(res.status, 201);
    assert.equal(res.body.leave.status, "pending");
    assert.equal(res.body.leave.days, 3);

    // Balance must not change until approval
    const bal = await request(app).get("/api/leaves/balance").set("Authorization", `Bearer ${token}`);
    assert.equal(bal.body.earnedLeave, 12);
  });

  it("rejects requests with insufficient balance", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post("/api/leaves")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-02-02", endDate: "2026-02-20", leaveType: "sick", reason: "Too long" });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /insufficient/i);
  });

  it("rejects overlapping leave requests", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");
    const { token } = await registerAndLogin();

    const first = await request(app)
      .post("/api/leaves")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...MON_FRI, leaveType: "earned", reason: "First" });
    assert.equal(first.status, 201);

    const overlap = await request(app)
      .post("/api/leaves")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-02-05", endDate: "2026-02-08", leaveType: "earned", reason: "Overlap" });
    assert.equal(overlap.status, 400);
    assert.match(overlap.body.error, /overlap/i);

    const adjacent = await request(app)
      .post("/api/leaves")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-02-09", endDate: "2026-02-11", leaveType: "sick", reason: "Adjoining" });
    assert.equal(adjacent.status, 201);
  });

  it("rejects a range with no working days", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post("/api/leaves")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-02-07", endDate: "2026-02-08", leaveType: "earned", reason: "Weekend only" });
    assert.equal(res.status, 400);
  });

  it("rejects invalid payloads", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");
    const { token } = await registerAndLogin();

    assert.equal((await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send({ ...MON_WED, leaveType: "casual", reason: "x" })).status, 400);
    assert.equal((await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send({ endDate: "2026-02-03", startDate: "2026-02-09", leaveType: "earned", reason: "x" })).status, 400);
    assert.equal((await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send({ ...MON_WED, leaveType: "earned", reason: "" })).status, 400);
    assert.equal((await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send({ startDate: "02/02/2026", endDate: "2026-02-04", leaveType: "earned", reason: "x" })).status, 400);
  });

  it("lists my leave history newest first", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");
    const { token } = await registerAndLogin();

    await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send({ ...MON_WED, leaveType: "earned", reason: "A" });
    const res = await request(app).get("/api/leaves/mine").set("Authorization", `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.leaves.length, 1);
    assert.equal(res.body.leaves[0].status, "pending");
  });

  it("cancels only pending requests", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");
    const { token } = await registerAndLogin();

    const created = await request(app).post("/api/leaves").set("Authorization", `Bearer ${token}`).send({ ...MON_WED, leaveType: "earned", reason: "Cancellable" });
    const id = created.body.leave.id;

    const cancel = await request(app).delete(`/api/leaves/${id}`).set("Authorization", `Bearer ${token}`);
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.leave.status, "cancelled");

    // Cancelling twice (already cancelled) must fail
    const again = await request(app).delete(`/api/leaves/${id}`).set("Authorization", `Bearer ${token}`);
    assert.equal(again.status, 400);

    // Missing request
    const missing = await request(app).delete("/api/leaves/999999").set("Authorization", `Bearer ${token}`);
    assert.equal(missing.status, 404);
  });

  it("blocks managers from employee endpoints", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");
    const { token } = await registerAndLogin("manager");

    const res = await request(app).get("/api/leaves/mine").set("Authorization", `Bearer ${token}`);
    assert.equal(res.status, 403);
  });
});
