import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Forward the real client IP (first entry of x-forwarded-for, or
// x-real-ip) so token refreshes triggered here count toward the
// real user's per-IP auth rate-limit bucket — not Vercel's egress.
function clientIp(request: NextRequest): string | undefined {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim();
  return request.headers.get("x-real-ip") ?? undefined;
}

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } });

  if (!supabaseUrl || !supabaseKey) return supabaseResponse;

  const ip = clientIp(request);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
    ...(ip ? { global: { headers: { "X-Forwarded-For": ip } } } : {}),
  });

  await supabase.auth.getUser();

  return supabaseResponse;
};
