"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";
import {
  detectPostalKind,
  normalizeCanadian,
  regionFromCanadianPostal,
} from "@/lib/postal";

// Province name → ISO 3166-2 region code, used to cross-check the
// postal code the BM entered against the province they selected.
// Mismatch is a soft block — postal districts sometimes span borders,
// but most mismatches are typos worth catching at creation time.
const PROVINCE_TO_REGION: Record<string, string> = {
  ontario: "CA-ON",
  on: "CA-ON",
  quebec: "CA-QC",
  qc: "CA-QC",
  "québec": "CA-QC",
  "british columbia": "CA-BC",
  bc: "CA-BC",
  alberta: "CA-AB",
  ab: "CA-AB",
  manitoba: "CA-MB",
  mb: "CA-MB",
  saskatchewan: "CA-SK",
  sk: "CA-SK",
  "nova scotia": "CA-NS",
  ns: "CA-NS",
  "new brunswick": "CA-NB",
  nb: "CA-NB",
  newfoundland: "CA-NL",
  "newfoundland and labrador": "CA-NL",
  nl: "CA-NL",
  "prince edward island": "CA-PE",
  pe: "CA-PE",
  pei: "CA-PE",
  yukon: "CA-YT",
  yt: "CA-YT",
  "northwest territories": "CA-NT",
  nt: "CA-NT",
  nunavut: "CA-NU",
  nu: "CA-NU",
};

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(40),
  zipCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(40).default("Canada"),
  timezone: z.string().trim().min(1).max(60).default("America/Toronto"),
});

type Result = { ok: true } | { ok: false; error: string };

// BM self-serve building creation. Only allowed for verified BMs that
// don't already have a building — once linked, /team/buildings/new
// redirects out so we never end up with the same BM owning two buildings
// via the UI. Platform admin can still attach BMs to existing buildings
// from /platform/users when needed.
export async function createTeamBuilding(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireTeam();

  if (!can(session.appUser, "building.create")) {
    return { ok: false, error: "Only Building Managers can create a building." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  if (session.appUser.buildingId) {
    return { ok: false, error: "You're already linked to a building. Contact platform support to switch." };
  }

  const parsed = Body.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    zipCode: formData.get("zipCode"),
    country: (formData.get("country") as string) || "Canada",
    timezone: (formData.get("timezone") as string) || "America/Toronto",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  // Postal-code cross-check against the entered province. Canadian
  // postal codes encode province in the first letter; mismatches are
  // usually typos. Hard-fail on Canadian-format mismatch; skip the
  // check for US / international postal codes.
  const postalKind = detectPostalKind(parsed.data.zipCode);
  if (postalKind === "ca") {
    const inferred = regionFromCanadianPostal(parsed.data.zipCode);
    const claimed = PROVINCE_TO_REGION[parsed.data.state.trim().toLowerCase()] ?? null;
    if (inferred && claimed && inferred !== claimed) {
      return {
        ok: false,
        error: `Postal code ${normalizeCanadian(parsed.data.zipCode)} is in ${inferred} but you entered the province as ${parsed.data.state}. Double-check the address before continuing.`,
      };
    }
    // Normalise to canonical "A1A 1A1" form on save.
    parsed.data.zipCode = normalizeCanadian(parsed.data.zipCode);
  } else if (postalKind === "invalid") {
    return { ok: false, error: "Postal code format doesn't look right." };
  }

  const buildingId = randomUUID();
  await prisma.$transaction([
    prisma.building.create({
      data: { id: buildingId, type: "residential", ...parsed.data },
    }),
    prisma.user.update({
      where: { id: session.appUser.id },
      data: { buildingId },
    }),
  ]);

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "building.create",
    resource: "Building",
    resourceId: buildingId,
    buildingId,
    changes: {
      source: "team_self_serve",
      name: parsed.data.name,
      city: parsed.data.city,
      state: parsed.data.state,
      country: parsed.data.country,
    },
  });

  revalidatePath("/team");
  redirect("/team");
}
