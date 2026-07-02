// Integration tests for the DB-touching auth server actions. Unlike the pure
// crypto suite (auth-core.test.ts), these exercise registerUser / loginUser /
// setPasswordWithToken / provisionUserWithInvite against a real Postgres.
//
// They SKIP entirely when DATABASE_URL is unset, so CI and local runs without
// a database stay green. To run them, point DATABASE_URL at a throwaway test
// database that has the schema applied (npx prisma migrate deploy), then:
//   npm run test:integration
//
// next/headers cookies() is stubbed (test/setup-next-headers-stub.mjs) with an
// in-memory jar exposed as globalThis.__TEST_COOKIE_JAR__, so we can assert
// the session cookie the actions set.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const HAS_DB = Boolean(process.env.DATABASE_URL);

// node:test supports a top-level skip via the `skip` option per test. We gate
// every test on HAS_DB so the file is a clean no-op without a database.
const dbTest = (name: string, fn: () => Promise<void>) =>
  test(name, { skip: HAS_DB ? false : "DATABASE_URL not set — skipping DB integration tests" }, fn);

// Unique email per run so reruns don't collide; cleaned up in `after`.
const STAMP = Date.now();
const EMAIL = `inttest+${STAMP}@example.test`;
const INVITE_EMAIL = `inttest-invite+${STAMP}@example.test`;
const PASSWORD = "integration-test-pw-123";

type Mod = typeof import("@/lib/auth-actions");
type PrismaMod = typeof import("@/lib/prisma");

let actions: Mod;
let prisma: PrismaMod["prisma"];

function jar(): Map<string, string> {
  return (globalThis as unknown as { __TEST_COOKIE_JAR__: Map<string, string> }).__TEST_COOKIE_JAR__;
}

before(async () => {
  if (!HAS_DB) return;
  actions = await import("@/lib/auth-actions");
  ({ prisma } = await import("@/lib/prisma"));
});

after(async () => {
  if (!HAS_DB || !prisma) return;
  await prisma.user.deleteMany({ where: { email: { in: [EMAIL, INVITE_EMAIL] } } }).catch(() => {});
  await prisma.$disconnect().catch(() => {});
});

dbTest("registerUser creates a user, hashes the pw, and sets a session", async () => {
  jar()?.clear();
  const res = await actions.registerUser({ email: EMAIL, password: PASSWORD, name: "Int Test" });
  assert.deepEqual(res, { ok: true });

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  assert.ok(user, "user row created");
  assert.equal(user.role, "resident");
  assert.match(user.password ?? "", /^\$argon2id\$/, "password stored as argon2id hash");
  assert.notEqual(user.password, PASSWORD, "plaintext never stored");
  assert.ok(jar().get("bsync_session"), "session cookie was set");
});

dbTest("registerUser rejects a duplicate email", async () => {
  const res = await actions.registerUser({ email: EMAIL, password: PASSWORD, name: "Dup" });
  assert.equal(res.ok, false);
});

dbTest("loginUser succeeds with the right password, fails with the wrong one", async () => {
  jar()?.clear();
  const bad = await actions.loginUser(EMAIL, "wrong-password");
  assert.equal(bad.ok, false);
  assert.equal(jar().get("bsync_session"), undefined, "no session on failed login");

  const good = await actions.loginUser(EMAIL, PASSWORD);
  assert.deepEqual(good, { ok: true });
  assert.ok(jar().get("bsync_session"), "session set on successful login");
});

dbTest("loginUser does not reveal whether an unknown email exists", async () => {
  const res = await actions.loginUser(`nobody+${STAMP}@example.test`, "whatever");
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.error, "Incorrect email or password.");
});

dbTest("password reset token sets a new password and is single-use", async () => {
  // Drive the real flow: request reset → mint a token the same way the action
  // does → consume it. We re-create the token via the exported helpers to
  // avoid parsing the email, then assert the second use fails.
  const { signActionToken } = await import("@/lib/auth-core");
  const before = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true, password: true } });
  assert.ok(before);

  const token = signActionToken({
    purpose: "reset",
    sub: before.id,
    email: EMAIL,
    currentPasswordHash: before.password,
  });
  const newPw = "brand-new-pw-456";
  const ok = await actions.setPasswordWithToken(token, newPw);
  assert.deepEqual(ok, { ok: true });

  // New password works.
  jar()?.clear();
  assert.deepEqual(await actions.loginUser(EMAIL, newPw), { ok: true });

  // The same link no longer works — the pw-hash it was bound to has changed.
  const reuse = await actions.setPasswordWithToken(token, "another-pw-789");
  assert.equal(reuse.ok, false);
});

dbTest("provisionUserWithInvite creates a passwordless account", async () => {
  const res = await actions.provisionUserWithInvite({
    email: INVITE_EMAIL,
    role: "facility_manager",
    name: "Invited Staff",
  });
  assert.equal(res.ok, true);

  const user = await prisma.user.findUnique({ where: { email: INVITE_EMAIL } });
  assert.ok(user);
  assert.equal(user.password, null, "no password until the invite is accepted");
  assert.equal(user.role, "facility_manager");
});
