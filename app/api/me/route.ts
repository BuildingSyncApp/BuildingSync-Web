import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { capabilitiesFor } from "@/lib/permissions";

// GET /api/me — the authenticated user + building context. The single call a
// client (web or native) makes on launch to learn who the user is. Matches the
// `Me` schema in public/openapi.yaml. Auth is cookie (web) or Bearer (mobile)
// via getApiUser.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getApiUser(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appUser } = session;
  return NextResponse.json({
    id: appUser.id,
    email: appUser.email,
    displayName: appUser.name ?? null,
    role: appUser.role,
    // Roles the account may operate as. For now this is just the assigned
    // role; multi-role accounts can widen this later without a client change.
    accessibleRoles: [appUser.role],
    buildingId: appUser.buildingId ?? null,
    unit: appUser.unit ?? null,
    // Surfaced so a client can render capability-gated UI without re-deriving
    // the matrix. Cheap and keeps the contract self-describing.
    capabilities: capabilitiesFor(appUser.role),
  });
}
