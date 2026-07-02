"use server";

import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  newUserId,
  signActionToken,
  verifyActionToken,
} from "@/lib/auth-core";
import { createSession, destroySession, readSession } from "@/lib/session";
import { findBuildingByInviteCode, normalizeInviteCode } from "@/lib/invite-code";
import { validatePostalAgainstBuilding } from "@/lib/postal";
import { logAuditFireAndForget } from "@/lib/audit";
import { sendEmailFireAndForget } from "@/lib/email";
import { passwordResetEmail, setPasswordInviteEmail } from "@/lib/email";

// Own-auth server actions. The credential store is the Prisma `User`
// table (argon2id hash in `User.password`); sessions are the signed cookie
// from lib/session. Replaces every Supabase Auth call that used to live in
// the signup/signin/reset pages and the team-provisioning actions.

const APP_URL = process.env.APP_BASE_URL || "https://buildingsync.app";

export type AuthResult = { ok: true } | { ok: false; error: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Generic message for the login path — never reveal whether the email
// exists or the password was wrong (avoids account enumeration).
const BAD_CREDENTIALS = "Incorrect email or password.";

// Minimal server-side password policy. The UI shows a strength meter, but
// the server is the authority. argon2 has no length cap concern, but we
// reject absurdly long inputs to bound hashing cost (DoS guard).
function validatePassword(pw: string): string | null {
  if (typeof pw !== "string" || pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 200) return "Password is too long.";
  return null;
}

// ── Register (public signup) ────────────────────────────────────────────
// Creates the User row with all signup extras already persisted (we own
// the row now — no Supabase user_metadata round-trip). Applies an invite
// code if present, then starts a session so the user lands signed-in.
export type RegisterInput = {
  email: string;
  password: string;
  name: string;
  phone?: string | null;
  inviteCode?: string | null;
  region?: string | null;
  postalCode?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // BM-only
  company?: string | null;
  managerType?: string | null;
  businessNumber?: string | null;
  licenseNumber?: string | null;
};

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) return { ok: false, error: "Enter a valid email address." };
  const pwErr = validatePassword(input.password);
  if (pwErr) return { ok: false, error: pwErr };
  if (!input.name?.trim()) return { ok: false, error: "Enter your name." };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // Don't leak existence on signup either; nudge to sign in.
    return { ok: false, error: "An account with this email already exists. Try signing in." };
  }

  const password = await hashPassword(input.password);

  // Resolve invite code (optional) before create so we can link in one write.
  let buildingId: string | null = null;
  let buildingPostal: string | null = null;
  const rawCode = input.inviteCode ? normalizeInviteCode(input.inviteCode) : null;
  if (rawCode && rawCode.length === 6) {
    const building = await findBuildingByInviteCode(rawCode);
    if (building) {
      buildingId = building.id;
      const full = await prisma.building
        .findUnique({ where: { id: building.id }, select: { zipCode: true } })
        .catch(() => null);
      buildingPostal = full?.zipCode ?? null;
    }
  }

  // BMs always land as "resident" until an admin verifies them — never
  // trust client-supplied role intent for privilege.
  const user = await prisma.user.create({
    data: {
      id: newUserId(),
      email,
      password,
      role: "resident",
      name: input.name.trim(),
      phone: input.phone?.trim() || undefined,
      region: input.region || undefined,
      postalCode: input.postalCode?.trim() || undefined,
      city: input.city?.trim() || undefined,
      latitude: typeof input.latitude === "number" ? input.latitude : undefined,
      longitude: typeof input.longitude === "number" ? input.longitude : undefined,
      company: input.company?.trim() || undefined,
      managerType: input.managerType || undefined,
      businessNumber: input.businessNumber?.trim() || undefined,
      licenseNumber: input.licenseNumber?.trim() || undefined,
      buildingId: buildingId || undefined,
    },
  });

  logAuditFireAndForget({
    userId: user.id,
    userEmail: user.email,
    buildingId: buildingId || undefined,
    action: "auth.signup",
    resource: "User",
    resourceId: user.id,
    changes: buildingId ? { invite_code: rawCode } : undefined,
  });

  if (buildingId) {
    logAuditFireAndForget({
      userId: user.id,
      userEmail: user.email,
      buildingId,
      action: "invite_code.redeem",
      resource: "User",
      resourceId: user.id,
      changes: { code: rawCode },
    });
    // Soft FSA cross-check — logged for the BM to review, never blocks signup
    // (resident may have just moved, be subletting, or live nearby with an
    // off-by-FSA building entry). Mirrors the old getOrCreateAppUser check.
    if (user.postalCode && buildingPostal) {
      const issue = validatePostalAgainstBuilding(user.postalCode, buildingPostal);
      if (issue) {
        logAuditFireAndForget({
          userId: user.id,
          userEmail: user.email,
          buildingId,
          action: "invite_code.fsa_mismatch",
          resource: "User",
          resourceId: user.id,
          changes: {
            residentPostal: user.postalCode,
            buildingPostal,
            reason: issue.message,
          },
        });
      }
    }
  }

  await createSession({ id: user.id, email: user.email });
  return { ok: true };
}

// ── Login ─────────────────────────────────────────────────────────────
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, email: true, password: true, isActive: true, archivedAt: true },
  });

  // Always run a verify to keep timing roughly constant whether or not the
  // user exists (mitigates enumeration via response time).
  const hash = user?.password ?? "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const valid = await verifyPassword(hash, password);

  if (!user || !user.password || !valid) {
    return { ok: false, error: BAD_CREDENTIALS };
  }
  if (!user.isActive || user.archivedAt) {
    return { ok: false, error: "This account is inactive. Contact your building administrator." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  logAuditFireAndForget({
    userId: user.id,
    userEmail: user.email,
    action: "auth.login",
    resource: "User",
    resourceId: user.id,
  });

  await createSession({ id: user.id, email: user.email });
  return { ok: true };
}

// ── Logout ────────────────────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
  const session = await readSession();
  if (session) {
    logAuditFireAndForget({
      userId: session.sub,
      userEmail: session.email,
      action: "auth.logout",
      resource: "User",
      resourceId: session.sub,
    });
  }
  await destroySession();
}

// ── Password reset (request) ──────────────────────────────────────────
// Always returns ok (never reveals whether the email exists). Sends a
// signed, self-expiring reset link when the account exists.
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, email: true, password: true },
  });
  if (user) {
    const token = signActionToken({
      purpose: "reset",
      sub: user.id,
      email: user.email,
      currentPasswordHash: user.password,
    });
    const url = `${APP_URL}/auth/reset?token=${encodeURIComponent(token)}`;
    const mail = passwordResetEmail({ url });
    sendEmailFireAndForget({ to: user.email, ...mail });
    logAuditFireAndForget({
      userId: user.id,
      userEmail: user.email,
      action: "auth.reset_requested",
      resource: "User",
      resourceId: user.id,
    });
  }
  // Uniform response regardless of existence.
  return { ok: true };
}

// ── Password reset / set-password invite (confirm) ────────────────────
// Shared by both "reset" and "invite" tokens — verifying the token binds
// to the user's CURRENT password hash, so a token is single-use by
// construction once the password changes.
export async function setPasswordWithToken(token: string, newPlainPassword: string): Promise<AuthResult> {
  const pwErr = validatePassword(newPlainPassword);
  if (pwErr) return { ok: false, error: pwErr };

  // We can't verify the token without the user's current hash, but the
  // token carries the user id — load by id, then verify against that hash.
  // To find the id without trusting the token, decode the (signed) payload
  // only after a successful HMAC check below; so first parse the id from a
  // best-effort decode, then re-verify cryptographically.
  const sub = peekTokenSubject(token);
  if (!sub) return { ok: false, error: "This link is invalid or has expired." };

  const user = await prisma.user.findUnique({
    where: { id: sub },
    select: { id: true, email: true, password: true },
  });
  if (!user) return { ok: false, error: "This link is invalid or has expired." };

  const payload = verifyActionToken(token, user.password);
  if (!payload || payload.sub !== user.id) {
    return { ok: false, error: "This link is invalid or has expired." };
  }

  const password = await hashPassword(newPlainPassword);
  await prisma.user.update({ where: { id: user.id }, data: { password } });

  logAuditFireAndForget({
    userId: user.id,
    userEmail: user.email,
    action: payload.p === "invite" ? "auth.invite_accepted" : "auth.password_reset",
    resource: "User",
    resourceId: user.id,
  });

  // Sign them in after a successful reset/invite — they proved control of
  // the email by clicking the link.
  await createSession({ id: user.id, email: user.email });
  return { ok: true };
}

// Best-effort decode of the token subject WITHOUT trusting it — used only
// to look up the user so we can fetch the real hash for cryptographic
// verification. The HMAC check in setPasswordWithToken is the real gate.
function peekTokenSubject(token: string): string | null {
  try {
    const [payloadB64] = token.trim().split(".");
    if (!payloadB64) return null;
    const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (payloadB64.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    const obj = JSON.parse(json) as { sub?: unknown };
    return typeof obj.sub === "string" ? obj.sub : null;
  } catch {
    return null;
  }
}

// ── Provisioning helper (team residents/staff) ────────────────────────
// Replaces Supabase admin.createUser. Creates a passwordless User row and
// emails a signed set-password invite link. Returns the created user id.
export async function provisionUserWithInvite(input: {
  email: string;
  name?: string | null;
  role: "resident" | "tenant" | "facility_manager" | "concierge" | "staff" | "security";
  buildingId?: string | null;
  unitId?: string | null;
  phone?: string | null;
  invitedByLabel?: string | null;
  buildingName?: string | null;
}): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) return { ok: false, error: "Enter a valid email address." };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "A user with this email already exists." };

  const user = await prisma.user.create({
    data: {
      id: newUserId(),
      email,
      password: null, // set via invite link
      role: input.role,
      name: input.name?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      buildingId: input.buildingId || undefined,
      unitId: input.unitId || undefined,
    },
  });

  const token = signActionToken({
    purpose: "invite",
    sub: user.id,
    email: user.email,
    currentPasswordHash: null,
  });
  const url = `${APP_URL}/auth/reset?token=${encodeURIComponent(token)}&invite=1`;
  const mail = setPasswordInviteEmail({
    url,
    buildingName: input.buildingName ?? null,
    role: input.role,
    invitedByLabel: input.invitedByLabel ?? null,
  });
  sendEmailFireAndForget({ to: user.email, ...mail });

  return { ok: true, userId: user.id };
}
