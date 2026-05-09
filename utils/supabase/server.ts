import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Vercel sets `x-forwarded-for` to a comma-separated list with the
// real client IP first. Forwarding it lets Supabase's per-IP auth
// rate limits actually apply behind Vercel — without this, every
// request looks like it's coming from a Vercel egress IP.
function clientIpFrom(h: Headers): string | undefined {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim();
  return h.get("x-real-ip") ?? undefined;
}

export const createClient = async (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  const ip = clientIpFrom(await headers());

  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware handles refresh.
        }
      },
    },
    ...(ip ? { global: { headers: { "X-Forwarded-For": ip } } } : {}),
  });
};
