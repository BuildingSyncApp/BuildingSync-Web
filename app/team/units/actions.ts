"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";

const Body = z.object({
  unitNumber: z.string().trim().min(1).max(20),
  floor: z.coerce.number().int().min(0).max(200).optional().nullable(),
  rentAmount: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
});

type Result =
  | { ok: true; unitNumber: string }
  | { ok: false; error: string };

export async function addUnit(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireTeam();
  if (!can(session.appUser, "unit.manage")) {
    return { ok: false, error: "Only Building Managers and Facility Managers can add units." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = Body.safeParse({
    unitNumber: formData.get("unitNumber"),
    floor: formData.get("floor") || null,
    rentAmount: formData.get("rentAmount") || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { unitNumber, floor, rentAmount } = parsed.data;

  try {
    await prisma.unit.create({
      data: {
        id: randomUUID(),
        buildingId: session.appUser.buildingId,
        unitNumber,
        floor: floor ?? null,
        rentAmount: rentAmount ?? null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: `Unit ${unitNumber} already exists in this building.` };
    }
    throw e;
  }

  revalidatePath("/team/units");
  revalidatePath("/team/residents");
  return { ok: true, unitNumber };
}

// ─── Bulk CSV onboarding ─────────────────────────────────────────────

type BulkRowOk = { row: number; unitNumber: string; status: "created" };
type BulkRowErr = { row: number; unitNumber: string; error: string };
type BulkResult =
  | { ok: true; created: number; skipped: number; rows: BulkRowOk[]; errors: BulkRowErr[] }
  | { ok: false; error: string };

export async function bulkAddUnits(_prev: unknown, formData: FormData): Promise<BulkResult> {
  const session = await requireTeam();
  if (!can(session.appUser, "unit.manage")) {
    return { ok: false, error: "Only Building Managers and Facility Managers can bulk-import units." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  // Accept either pasted textarea or uploaded file.
  let text = (formData.get("csv") as string | null) ?? "";
  const file = formData.get("file") as File | null;
  if (file && typeof file === "object" && "text" in file) {
    const fromFile = await file.text();
    if (fromFile.trim()) text = fromFile;
  }
  if (!text.trim()) {
    return { ok: false, error: "Paste CSV rows or upload a .csv file." };
  }

  // Pre-fetch existing unitNumbers to detect duplicates without one query per row.
  const existing = await prisma.unit.findMany({
    where: { buildingId: session.appUser.buildingId },
    select: { unitNumber: true },
  });
  const existingSet = new Set(existing.map((u) => u.unitNumber.toLowerCase()));

  const rows: BulkRowOk[] = [];
  const errors: BulkRowErr[] = [];
  let created = 0;
  let skipped = 0;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Skip a header row if present (first cell starts with "unit").
  const startIdx = lines[0]?.toLowerCase().startsWith("unit") ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const rowNum = i + 1;
    const cells = lines[i].split(",").map((c) => c.trim());
    const unitNumber = cells[0] || "";
    const floorRaw = cells[1] || "";
    const rentRaw = cells[2] || "";

    if (!unitNumber || unitNumber.length > 20) {
      errors.push({ row: rowNum, unitNumber, error: "missing or invalid unit number" });
      continue;
    }

    // Duplicate-in-DB OR duplicate-within-batch.
    const lower = unitNumber.toLowerCase();
    if (existingSet.has(lower)) {
      errors.push({ row: rowNum, unitNumber, error: "already exists in this building" });
      skipped++;
      continue;
    }
    existingSet.add(lower); // claim it so a duplicate later in the same batch errors too

    const parsed = Body.safeParse({
      unitNumber,
      floor: floorRaw || null,
      rentAmount: rentRaw || null,
    });
    if (!parsed.success) {
      errors.push({
        row: rowNum,
        unitNumber,
        error: parsed.error.issues.map((iss) => iss.message).join("; "),
      });
      continue;
    }

    try {
      await prisma.unit.create({
        data: {
          id: randomUUID(),
          buildingId: session.appUser.buildingId,
          unitNumber: parsed.data.unitNumber,
          floor: parsed.data.floor ?? null,
          rentAmount: parsed.data.rentAmount ?? null,
        },
      });
      rows.push({ row: rowNum, unitNumber: parsed.data.unitNumber, status: "created" });
      created++;
    } catch (e) {
      // Race-condition fallback for the unique constraint.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        errors.push({ row: rowNum, unitNumber, error: "already exists in this building" });
        skipped++;
      } else {
        errors.push({
          row: rowNum,
          unitNumber,
          error: e instanceof Error ? e.message : "unknown error",
        });
      }
    }
  }

  revalidatePath("/team/units");
  revalidatePath("/team/residents");
  return { ok: true, created, skipped, rows, errors };
}
