"use server";

import { headers } from "next/headers";
import { getOrCreateAppUser } from "@/lib/auth";

const ADMIN_HOST = process.env.ADMIN_HOST || "admin.buildingsync.app";

// Server-side resolver that returns the URL the user should land on
// after successful sign-in. Beats the previous /?go=1 round-trip
// (which flashed the public landing for ~100ms before redirecting).
export async function resolvePortalUrl(): Promise<string> {
  const session = await getOrCreateAppUser();
  if (!session) return "/signin";

  const { appUser } = session;

  if (appUser.role === "admin") {
    const h = await headers();
    const host = h.get("host") || "";
    const isAdminHost = host === ADMIN_HOST || host.startsWith("admin.");
    return isAdminHost || process.env.NODE_ENV !== "production"
      ? "/platform"
      : `https://${ADMIN_HOST}/platform`;
  }

  // BM accounts go through admin verification before they can use /team.
  // FM and concierge are hired by an already-verified BM, so they skip
  // the gate. Other roles never need it.
  if (appUser.role === "building_manager" && !appUser.verifiedAt) {
    return "/onboarding/pending";
  }
  if (appUser.role === "building_manager" || appUser.role === "facility_manager" || appUser.role === "concierge") {
    return "/team";
  }

  // First-time sign-in (no profile yet, no building) lands on /onboarding;
  // returning users go straight to /dashboard.
  if (!appUser.name || !appUser.buildingId) return "/onboarding";
  return "/dashboard";
}
