import "server-only";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import argon2 from "argon2";

// Own-auth core. Replaces Supabase Auth. Two responsibilities:
//   1. Password hashing (argon2id) — the only credential store is the
//      Prisma `User.password` column.
//   2. Stateless, HMAC-SHA256-signed tokens — for the session cookie and
//      for one-shot action links (password reset, set-password invites).
//
// Token format and crypto deliberately mirror lib/impersonation.ts /
// lib/license.ts (node:crypto HMAC, base64url, timingSafeEqual) so the
// codebase keeps a single signing idiom and adds no JWT dependency.

// ── Secret ────────────────────────────────────────────────────────────
// AUTH_SECRET signs session + action tokens. Must be a long random string
// set in .env (local) and Vercel env (prod). Never committed.
function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  if (secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 chars");
  return secret;
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET) && (process.env.AUTH_SECRET?.length ?? 0) >= 32;
}

// ── Password hashing (argon2id) ─────────────────────────────────────────
// argon2id is memory-hard and the OWASP-recommended default. The library's
// defaults (m=64MB, t=3, p=4) are used; the salt + params are stored inside
// the encoded hash string, so verify() needs no extra state.
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Malformed hash, wrong algorithm, etc. — treat as a failed login,
    // never throw into the auth path.
    return false;
  }
}

// New User ids. Supabase used to supply auth.uid; we now own id minting.
// uuid keeps ids opaque and collision-free; the column is a bare String.
export function newUserId(): string {
  return randomUUID();
}

// ── base64url (matches lib/impersonation.ts) ────────────────────────────
function b64urlEncode(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeToBuffer(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function sign(payloadB64: string): string {
  return b64urlEncode(createHmac("sha256", getSecret()).update(payloadB64).digest());
}

function verifySig(payloadB64: string, sigB64: string): boolean {
  let expected: Buffer;
  try {
    expected = createHmac("sha256", getSecret()).update(payloadB64).digest();
  } catch {
    return false;
  }
  const provided = b64urlDecodeToBuffer(sigB64);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

// ── Session token ───────────────────────────────────────────────────────
export const SESSION_COOKIE = "bsync_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Minimal session claims. Identity is the user id; email is carried so the
// hot path (getOrCreateAppUser) needn't hit the DB just to know who it is.
export type SessionPayload = {
  v: 1;
  sub: string; // user id
  email: string;
  iat: number;
  exp: number;
};

export function signSession(input: { sub: string; email: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    v: 1,
    sub: input.sub,
    email: input.email,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;
  if (!verifySig(payloadB64, sigB64)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(b64urlDecodeToBuffer(payloadB64).toString("utf8"));
  } catch {
    return null;
  }
  if (payload.v !== 1 || !payload.sub || !payload.email) return null;
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ── Action tokens (password reset + set-password invite) ─────────────────
// Stateless one-shot links. The token binds the user id + email + purpose
// and self-expires. We additionally bind it to a derivation of the user's
// CURRENT stored credential digest, so once the credential changes the link
// is single-use by construction — no server-side token table needed.
//
// NOTE: the value bound here is the user's *already-argon2id-hashed* stored
// credential (the `User.password` column), never a raw/plaintext password.
// We never hash a plaintext password with HMAC-SHA256 — plaintext passwords
// are hashed only by `hashPassword` (argon2id) above. The binding below is a
// keyed MAC over an opaque fragment of that strong digest, used purely to
// invalidate the link when the credential rotates.
export type ActionPurpose = "reset" | "invite";

export type ActionPayload = {
  v: 1;
  p: ActionPurpose;
  sub: string; // user id
  email: string;
  iat: number;
  exp: number;
};

const ACTION_TTL: Record<ActionPurpose, number> = {
  reset: 60 * 60, // 1 hour
  invite: 60 * 60 * 24 * 7, // 7 days — managers provision ahead of move-in
};

// A short, stable fragment of the user's stored *credential digest* (the
// argon2id hash already in the DB) — NOT a plaintext password. It is included
// as plain signed material in the token below (covered by the token's single
// HMAC signature), so the link invalidates the moment the credential rotates,
// without ever running its own hash over a password-derived value. A fixed
// marker is used when no credential is set yet (fresh invites).
function credentialBindingFragment(storedCredentialDigest: string | null): string {
  return storedCredentialDigest ? storedCredentialDigest.slice(-16) : "no-credential";
}

export function signActionToken(input: {
  purpose: ActionPurpose;
  sub: string;
  email: string;
  // The user's stored argon2id credential digest (User.password), or null.
  currentPasswordHash: string | null;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: ActionPayload = {
    v: 1,
    p: input.purpose,
    sub: input.sub,
    email: input.email,
    iat: now,
    exp: now + ACTION_TTL[input.purpose],
  };
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  // Sign over the payload + the credential-binding tag (derived above).
  const material = `${payloadB64}.${credentialBindingFragment(input.currentPasswordHash)}`;
  return `${payloadB64}.${b64urlEncode(createHmac("sha256", getSecret()).update(material).digest())}`;
}

export function verifyActionToken(
  token: string,
  currentPasswordHash: string | null,
): ActionPayload | null {
  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  let expected: Buffer;
  try {
    const material = `${payloadB64}.${credentialBindingFragment(currentPasswordHash)}`;
    expected = createHmac("sha256", getSecret()).update(material).digest();
  } catch {
    return null;
  }
  const provided = b64urlDecodeToBuffer(sigB64);
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  let payload: ActionPayload;
  try {
    payload = JSON.parse(b64urlDecodeToBuffer(payloadB64).toString("utf8"));
  } catch {
    return null;
  }
  if (payload.v !== 1 || !payload.sub || !payload.email) return null;
  if (payload.p !== "reset" && payload.p !== "invite") return null;
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
