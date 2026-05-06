import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const ADMIN_HOST = process.env.ADMIN_HOST || "admin.buildingsync.app";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // Subdomain split: admin.buildingsync.app → /admin/* internally.
  // Same Next.js deployment, different surface, role-gated server-side.
  const host = request.headers.get("host") || "";
  const isAdmin = host === ADMIN_HOST || host.startsWith("admin.");
  const url = request.nextUrl;

  if (isAdmin && !url.pathname.startsWith("/admin") && !url.pathname.startsWith("/_next") && !url.pathname.startsWith("/api")) {
    url.pathname = `/admin${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url, { headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
