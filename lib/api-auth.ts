import { getOrCreateAppUser, type SessionUser } from "@/lib/auth";
import { verifySession } from "@/lib/auth-core";
import { prisma } from "@/lib/prisma";
import type { User as AppUser } from "@prisma/client";
import type { ImpersonationSession } from "@/lib/impersonation";

// Unified auth resolver for API routes that serve both the web app
// (cookie-based session) and native clients (Authorization: Bearer <token>).
// The bearer token is the same signed session token we set in the cookie
// (lib/auth-core signSession), so native clients authenticate by sending
// the token they received at login. Web routes that only need cookie auth
// can keep calling getOrCreateAppUser directly; routes exposed to mobile
// should call getApiUser.

async function resolveBearer(token: string): Promise<{ authUser: SessionUser; appUser: AppUser } | null> {
  const payload = verifySession(token);
  if (!payload?.sub || !payload.email) return null;
  const authUser: SessionUser = { id: payload.sub, email: payload.email };
  const appUser = await prisma.user.upsert({
    where: { id: authUser.id },
    update: { email: authUser.email },
    create: { id: authUser.id, email: authUser.email, role: "resident" },
  });
  if (!appUser.isActive || appUser.archivedAt) return null;
  return { authUser, appUser };
}

export async function getApiUser(
  request: Request,
): Promise<{ authUser: SessionUser; appUser: AppUser; impersonation?: ImpersonationSession } | null> {
  const auth = request.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    // Native/mobile bearer path NEVER impersonates — impersonation is a
    // cookie-only, admin-web concern. Resolve and return immediately.
    const token = auth.slice(7).trim();
    if (token) return resolveBearer(token);
    return null;
  }
  // Cookie path: getOrCreateAppUser applies any active impersonation swap.
  return getOrCreateAppUser();
}
