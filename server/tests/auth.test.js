import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";

// helpers must be imported before the app so it can point DATABASE_URL at the test database
const helpers = await import("./helpers.js");
const { default: app } = await import("../src/app.js");

describe("Auth API", () => {
  let manager;
  let managerToken;

  before(async () => {
    await helpers.initDb();
    if (!helpers.dbAvailable) return;

    const passwordHash = await bcrypt.hash(helpers.demoPassword, 10);
    const result = await helpers.pool.query(
      `INSERT INTO managers (name, email, password)
       VALUES ('Test Manager', $1, $2)
       RETURNING id, name, email`,
      [helpers.uniqueEmail("manager"), passwordHash]
    );
    manager = result.rows[0];
    const login = await request(app)
      .post("/api/auth/login/manager")
      .send({ email: manager.email, password: helpers.demoPassword });
    managerToken = login.body.token;
  });

  after(async () => {
    if (helpers.dbAvailable) await helpers.pool.end();
  });

  it("reports PostgreSQL connectivity in the health check", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: "ok", database: "connected" });
  });

  it("registers an employee", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        name: "Test Employee",
        email: helpers.uniqueEmail("reg"),
        password: helpers.demoPassword,
        managerId: 99999,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, "employee");
    assert.equal(res.body.user.name, "Test Employee");
    assert.equal(res.body.user.manager_id, manager.id);
    assert.ok(!("password" in res.body.user), "must not expose password hash");
  });

  it("requires a manager to register employees", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Unassigned Employee",
        email: helpers.uniqueEmail("unassigned"),
        password: helpers.demoPassword,
      });
    assert.equal(res.status, 401);
  });

  it("rejects duplicate email", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const email = helpers.uniqueEmail("dup");
    await request(app).post("/api/auth/register").set("Authorization", `Bearer ${managerToken}`).send({ name: "A", email, password: helpers.demoPassword });

    const res = await request(app).post("/api/auth/register").set("Authorization", `Bearer ${managerToken}`).send({ name: "B", email, password: helpers.demoPassword });
    assert.equal(res.status, 409);
  });

  it("rejects invalid registration payloads", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    assert.equal((await request(app).post("/api/auth/register").set("Authorization", `Bearer ${managerToken}`).send({ name: "", email: "x@y.z", password: helpers.demoPassword })).status, 400);
    assert.equal((await request(app).post("/api/auth/register").set("Authorization", `Bearer ${managerToken}`).send({ name: "A", email: "not-an-email", password: helpers.demoPassword })).status, 400);
    assert.equal((await request(app).post("/api/auth/register").set("Authorization", `Bearer ${managerToken}`).send({ name: "A", email: "a@b.c", password: "123" })).status, 400);
  });

  it("logs in and returns a token + user", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const email = helpers.uniqueEmail("login");
    await request(app).post("/api/auth/register").set("Authorization", `Bearer ${managerToken}`).send({ name: "Login User", email, password: helpers.demoPassword });

    const res = await request(app).post("/api/auth/login/employee").send({ email, password: helpers.demoPassword });
    assert.equal(res.status, 200);
    assert.ok(res.body.token, "token should be present");
    assert.equal(res.body.user.email, email);

    const bad = await request(app).post("/api/auth/login/employee").send({ email, password: "WrongPass1" });
    assert.equal(bad.status, 401);
  });

  it("keeps employee and manager logins separate", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const email = helpers.uniqueEmail("sep");
    await request(app).post("/api/auth/register").set("Authorization", `Bearer ${managerToken}`).send({ name: "Sep", email, password: helpers.demoPassword });

    // An employee cannot sign in through the manager login (and vice versa).
    const asManager = await request(app).post("/api/auth/login/manager").send({ email, password: helpers.demoPassword });
    assert.equal(asManager.status, 401);
    const asEmployee = await request(app).post("/api/auth/login/employee").send({ email: manager.email, password: helpers.demoPassword });
    assert.equal(asEmployee.status, 401);

    const ok = await request(app).post("/api/auth/login/manager").send({ email: manager.email, password: helpers.demoPassword });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.role, "manager");

    const badRole = await request(app).post("/api/auth/login/admin").send({ email, password: helpers.demoPassword });
    assert.equal(badRole.status, 400);
  });

  it("accepts login requests using the legacy /auth path", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({
        email: helpers.uniqueEmail("legacy-login"),
        password: helpers.demoPassword,
        role: "employee",
      });

    assert.ok(
      [401, 500].includes(res.status),
      `Expected the legacy path to reach the login controller, got HTTP ${res.status}`
    );
  });

  it("returns the current user via /me", async (t) => {
    if (!helpers.dbAvailable) return t.skip("PostgreSQL not available");

    const email = helpers.uniqueEmail("me");
    const reg = await request(app).post("/api/auth/register").set("Authorization", `Bearer ${managerToken}`).send({ name: "Me User", email, password: helpers.demoPassword });
    const login = await request(app).post("/api/auth/login/employee").send({ email, password: helpers.demoPassword });

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.id, reg.body.user.id);

    const denied = await request(app).get("/api/auth/me");
    assert.equal(denied.status, 401);
  });
});