import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  type SessionPayload,
} from "@/lib/auth-core";

// Server-side session cookie boundary. The only place that reads/writes the
// session cookie via next/headers, so cookie attributes live in one spot.

const cookieOptions = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

// Create a session for a freshly authenticated user (login / signup /
// set-password). Sets the signed cookie.
export async function createSession(user: { id: string; email: string }): Promise<void> {
  const token = signSession({ sub: user.id, email: user.email });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions);
}

// Read + verify the current session. Returns null when absent/expired/forged.
export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

// Clear the session cookie (logout).
export async function destroySession(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}
