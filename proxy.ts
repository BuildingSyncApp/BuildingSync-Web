import { type NextRequest, NextResponse } from "next/server";

const ADMIN_HOST = process.env.ADMIN_HOST || "admin.buildingsync.app";

// Paths that must NOT be prefixed with /platform on the admin host —
// shared auth flows, public legal/help pages, API routes, public
// assets, and anything already addressed under /platform.
const PASS_THROUGH_PREFIXES = [
  "/signin",
  "/signup",
  "/auth",
  "/offline",
  "/privacy",
  "/terms",
  "/legal",
  "/security",
  "/integrations",
  "/docs",
  "/developers",
  "/api",
  "/_next",
  "/platform",
];

const STATIC_FILE = /\.(svg|png|jpe?g|gif|webp|ico|js|css|json|webmanifest|txt|map)$/i;

export async function proxy(request: NextRequest) {
  // Our session is a stateless, signed cookie (lib/auth-core) — unlike the
  // old Supabase session it needs no per-request server-side refresh, so the
  // proxy just passes requests through and handles admin-host rewriting.
  const response = NextResponse.next({ request: { headers: request.headers } });
  const host = request.headers.get("host") || "";
  const isAdmin = host === ADMIN_HOST || host.startsWith("admin.");
  if (!isAdmin) return response;

  const url = request.nextUrl;

  // While an admin is impersonating, render the target portal in-place on
  // the admin host instead of rewriting to /platform. Cookie *presence* is
  // only a routing hint — the actual identity swap is decided by the
  // signature-verifying resolver (lib/impersonation-server), since the HMAC
  // secret isn't available in the Edge runtime. "/" is included so the
  // admin-host root doesn't loop (app/page.tsx routes the user onward).
  if (request.cookies.get("bsync_imp")?.value) {
    const p = url.pathname;
    const impPassThrough =
      p === "/" ||
      ["/team", "/dashboard", "/onboarding"].some((x) => p === x || p.startsWith(x + "/"));
    if (impPassThrough) return response;
  }
  const passThrough =
    PASS_THROUGH_PREFIXES.some(
      (p) => url.pathname === p || url.pathname.startsWith(p + "/"),
    ) || STATIC_FILE.test(url.pathname);
  if (passThrough) return response;

  // admin.buildingsync.app → /platform/* surface (BuildingSync company admin)
  url.pathname = `/platform${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url, { headers: response.headers });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
