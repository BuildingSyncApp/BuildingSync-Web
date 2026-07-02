// Security-core tests for lib/auth-core: password hashing + the two signed
// token families (session, action). These are the load-bearing crypto
// primitives behind own auth — the suite proves the security properties
// (rejection of forged / tampered / expired / wrong-secret tokens), not just
// the happy path. Pure functions, no DB.
//
// Run: AUTH_SECRET must be set; the npm "test" script sets it. Uses the
// node:test runner via tsx, with the server-only stub (--import).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  hashPassword,
  verifyPassword,
  newUserId,
  signSession,
  verifySession,
  signActionToken,
  verifyActionToken,
} from "@/lib/auth-core";

// ── Password hashing (argon2id) ─────────────────────────────────────────
test("hashPassword produces an argon2id hash that verifies", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.match(hash, /^\$argon2id\$/, "expected an argon2id encoded hash");
  assert.equal(await verifyPassword(hash, "correct horse battery staple"), true);
});

test("verifyPassword rejects the wrong password", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.equal(await verifyPassword(hash, "wrong password"), false);
});

test("verifyPassword returns false (never throws) on a malformed hash", async () => {
  assert.equal(await verifyPassword("not-a-real-hash", "whatever"), false);
  assert.equal(await verifyPassword("", "whatever"), false);
});

test("two hashes of the same password differ (random salt)", async () => {
  const a = await hashPassword("same-password");
  const b = await hashPassword("same-password");
  assert.notEqual(a, b, "salts should make hashes distinct");
  assert.equal(await verifyPassword(a, "same-password"), true);
  assert.equal(await verifyPassword(b, "same-password"), true);
});

test("newUserId returns distinct uuid-shaped ids", () => {
  const a = newUserId();
  const b = newUserId();
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

// ── Session tokens ──────────────────────────────────────────────────────
test("signSession → verifySession round-trips identity", () => {
  const token = signSession({ sub: "user-1", email: "a@b.com" });
  const payload = verifySession(token);
  assert.ok(payload);
  assert.equal(payload.sub, "user-1");
  assert.equal(payload.email, "a@b.com");
  assert.equal(payload.v, 1);
});

test("verifySession rejects empty / malformed input", () => {
  assert.equal(verifySession(undefined), null);
  assert.equal(verifySession(null), null);
  assert.equal(verifySession(""), null);
  assert.equal(verifySession("garbage"), null);
  assert.equal(verifySession("only.one.dot.too.many"), null);
});

test("verifySession rejects a tampered payload", () => {
  const token = signSession({ sub: "user-1", email: "a@b.com" });
  const [, sig] = token.split(".");
  // Forge a payload claiming to be a different user, keep the old signature.
  const forgedPayload = Buffer.from(
    JSON.stringify({ v: 1, sub: "admin", email: "admin@b.com", iat: 1, exp: 9999999999 }),
    "utf8",
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  assert.equal(verifySession(`${forgedPayload}.${sig}`), null);
});

test("verifySession rejects a tampered signature", () => {
  const token = signSession({ sub: "user-1", email: "a@b.com" });
  const [payload] = token.split(".");
  assert.equal(verifySession(`${payload}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`), null);
});

test("verifySession rejects an expired token", () => {
  // Mint a token "in the past" by overriding the clock, then verify it after
  // its TTL (30d) has elapsed. This exercises the real exp check end-to-end
  // with a correctly-signed token (no forgery).
  const realNow = Date.now;
  try {
    const past = new Date("2020-01-01T00:00:00Z").getTime();
    Date.now = () => past;
    const token = signSession({ sub: "user-1", email: "a@b.com" });
    Date.now = realNow; // back to the present — well beyond the 30d TTL
    assert.equal(verifySession(token), null, "a token minted in 2020 must be expired now");
  } finally {
    Date.now = realNow;
  }
});

// ── Action tokens (reset / invite), bound to the current pw-hash ─────────
test("action token round-trips when the pw-hash is unchanged", () => {
  const hash = "$argon2id$v=19$m=65536,t=3,p=4$abcdefghijklmnop$ZZZZZZZZZZZZZZZZ";
  const token = signActionToken({ purpose: "reset", sub: "u1", email: "a@b.com", currentPasswordHash: hash });
  const payload = verifyActionToken(token, hash);
  assert.ok(payload);
  assert.equal(payload.p, "reset");
  assert.equal(payload.sub, "u1");
});

test("action token is single-use: changing the pw-hash invalidates it", () => {
  const oldHash = "$argon2id$v=19$m=65536,t=3,p=4$aaaaaaaaaaaaaaaa$OLDOLDOLDOLDOLD0";
  const token = signActionToken({ purpose: "reset", sub: "u1", email: "a@b.com", currentPasswordHash: oldHash });
  // After a successful reset the stored hash changes; the same link must fail.
  const newHash = "$argon2id$v=19$m=65536,t=3,p=4$bbbbbbbbbbbbbbbb$NEWNEWNEWNEWNEW1";
  assert.equal(verifyActionToken(token, newHash), null);
  // ...but still verifies against the hash it was minted for.
  assert.ok(verifyActionToken(token, oldHash));
});

test("invite token (null pw-hash) round-trips, and binds to 'no password'", () => {
  const token = signActionToken({ purpose: "invite", sub: "u1", email: "a@b.com", currentPasswordHash: null });
  assert.ok(verifyActionToken(token, null));
  // Once a password is set, the invite link no longer verifies.
  const setHash = "$argon2id$v=19$m=65536,t=3,p=4$cccccccccccccccc$SETSETSETSETSET2";
  assert.equal(verifyActionToken(token, setHash), null);
});

test("action token rejects a tampered signature", () => {
  const hash = "$argon2id$v=19$m=65536,t=3,p=4$dddddddddddddddd$SIGSIGSIGSIGSIG3";
  const token = signActionToken({ purpose: "reset", sub: "u1", email: "a@b.com", currentPasswordHash: hash });
  const [payload] = token.split(".");
  assert.equal(verifyActionToken(`${payload}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`, hash), null);
});

test("action token rejects malformed input", () => {
  assert.equal(verifyActionToken("garbage", null), null);
  assert.equal(verifyActionToken("a.b.c", null), null);
});
