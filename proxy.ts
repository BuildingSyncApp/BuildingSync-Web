import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

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
  "/docs",
  "/api",
  "/_next",
  "/platform",
];

const STATIC_FILE = /\.(svg|png|jpe?g|gif|webp|ico|js|css|json|webmanifest|txt|map)$/i;

export async function proxy(request: NextRequest) {
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

  // admin.buildingsync.app → /platform/* surface (BuildingSync company admin)
  url.pathname = `/platform${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url, { headers: response.headers });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
