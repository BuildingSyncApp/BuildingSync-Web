import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Clear the Supabase session AND the browser-side cookies.
//
// Subtle Next.js gotcha: when the supabase client's `setAll` writes via
// `cookies()` from next/headers, those mutations land on the request
// scope, not on an explicit NextResponse we return. The browser then
// keeps the old auth-token cookies and the user appears signed in on
// the next navigation. Wiring `setAll` directly to `response.cookies`
// fixes that.
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/signin?signedout=1", request.url),
    { status: 303 },
  );

  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options }),
          );
        },
      },
    });
    await supabase.auth.signOut();
  }

  return response;
}
