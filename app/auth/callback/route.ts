import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Reject anything that could escape our origin: absolute URLs, protocol-
// relative paths (`//evil.com`), backslash variants, and userinfo tricks
// like `/@evil.com` that some browsers parse as a host.
function safeNext(raw: string | null): string {
  const fallback = "/onboarding";
  if (!raw || !raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\") || raw.startsWith("/@")) return fallback;
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient(await cookies());
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/signin?error=callback`);
}
