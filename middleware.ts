import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const ADMIN_HOST = process.env.ADMIN_HOST || "admin.buildingsync.app";

// Paths that must NOT be prefixed with /admin even when served from the
// admin subdomain — auth flows, API routes, public assets, and anything
// already addressed under /admin.
const PASS_THROUGH_PREFIXES = [
  "/signin",
  "/signup",
  "/auth",
  "/offline",
  "/api",
  "/_next",
  "/admin",
];

const STATIC_FILE = /\.(svg|png|jpe?g|gif|webp|ico|js|css|json|webmanifest|txt|map)$/i;

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const host = request.headers.get("host") || "";
  const isAdmin = host === ADMIN_HOST || host.startsWith("admin.");
  if (!isAdmin) return response;

  const url = request.nextUrl;
  const passThrough =
    PASS_THROUGH_PREFIXES.some(
      (p) => url.pathname === p || url.pathname.startsWith(p + "/"),
    ) || STATIC_FILE.test(url.pathname);
  if (passThrough) return response;

  // Rewrite root and admin-relative paths into the /admin segment.
  // e.g. admin.buildingsync.app/work-orders → /admin/work-orders
  url.pathname = `/admin${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url, { headers: response.headers });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
