import { NextResponse, type NextRequest } from "next/server";

// Legacy endpoint. Under Supabase Auth this exchanged an email-confirmation
// / OAuth `code` for a session. With own-auth there is no code exchange —
// signup, password reset, and invites set the session cookie directly. Kept
// only so stale links/bookmarks resolve gracefully instead of 404-ing; it
// simply forwards to sign-in.
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/signin`);
}
