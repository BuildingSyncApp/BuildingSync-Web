import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@prisma/client";

// Admin "View as / impersonate" token. Stateless + HMAC-signed (mirrors
// lib/license.ts). The signature proves the token was minted by our
// server (which only mints after a requirePlatformAdmin check); it does
// NOT by itself grant authority — the resolver in lib/impersonation-server
// independently re-checks that the live session is an admin. Both gates
// are required, so a stolen cookie is useless without the admin's
// Supabase session, and a forged cookie can't be signed without the secret.

export const IMPERSONATION_COOKIE = "bsync_imp";
export const IMPERSONATION_TTL_SECONDS = 15 * 60; // short-lived: 15 min

export type ImpersonationMode = "user" | "role";

// Signed token claims. Display labels (targetLabel) are captured at start
// time so the banner + audit attribution need no DB lookup.
export type ImpersonationPayload = {
  v: 1;
  mode: ImpersonationMode;
  adminId: string;
  adminEmail: string | null;
  targetLabel: string;
  iat: number;
  exp: number;
  // mode "user"
  targetUserId?: string;
  // mode "role"
  role?: UserRole;
  buildingId?: string;
};

// Resolved view of the token for the banner + audit (no DB).
export type ImpersonationContext =
  | { active: false }
  | {
      active: true;
      mode: ImpersonationMode;
      readOnly: boolean;
      adminId: string;
      adminEmail: string | null;
      targetLabel: string;
      targetUserId?: string;
      role?: UserRole;
      buildingId?: string;
    };

// Compact form attached to an authenticated session once a swap is applied.
export type ImpersonationSession = {
  mode: ImpersonationMode;
  readOnly: boolean;
  adminId: string;
  adminEmail: string | null;
  targetLabel: string;
};

function getSecret(): string {
  const secret = process.env.IMPERSONATION_SIGNING_SECRET;
  if (!secret) throw new Error("IMPERSONATION_SIGNING_SECRET is not set");
  return secret;
}

export function isImpersonationConfigured(): boolean {
  return Boolean(process.env.IMPERSONATION_SIGNING_SECRET);
}

function b64urlEncode(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeToBuffer(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

type SignInput = Omit<ImpersonationPayload, "v" | "iat" | "exp">;

export function signImpersonation(input: SignInput): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: ImpersonationPayload = {
    v: 1,
    iat: now,
    exp: now + IMPERSONATION_TTL_SECONDS,
    ...input,
  };
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = createHmac("sha256", getSecret()).update(payloadB64).digest();
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

export type VerifiedImpersonation =
  | { ok: true; payload: ImpersonationPayload }
  | { ok: false };

export function verifyImpersonation(token: string): VerifiedImpersonation {
  const parts = token.trim().split(".");
  if (parts.length !== 2) return { ok: false };
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return { ok: false };

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return { ok: false };
  }

  const expected = createHmac("sha256", secret).update(payloadB64).digest();
  const provided = b64urlDecodeToBuffer(sigB64);
  if (provided.length !== expected.length) return { ok: false };
  if (!timingSafeEqual(provided, expected)) return { ok: false };

  let payload: ImpersonationPayload;
  try {
    payload = JSON.parse(b64urlDecodeToBuffer(payloadB64).toString("utf8"));
  } catch {
    return { ok: false };
  }

  if (payload.v !== 1) return { ok: false };
  if (!payload.adminId || (payload.mode !== "user" && payload.mode !== "role")) return { ok: false };
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return { ok: false };

  return { ok: true, payload };
}
