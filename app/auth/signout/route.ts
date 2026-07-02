import { NextResponse, type NextRequest } from "next/server";
import { logoutUser } from "@/lib/auth-actions";

// Clears the session cookie (lib/session destroySession via logoutUser) and
// records an auth.logout audit entry, then bounces to /signin. POST-only so
// it can't be triggered by a cross-site <img>/link (CSRF-safe sign-out).
export async function POST(request: NextRequest) {
  await logoutUser();
  return NextResponse.redirect(new URL("/signin?signedout=1", request.url), { status: 303 });
}
