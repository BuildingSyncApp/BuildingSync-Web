"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { putObject, deleteObject, getDownloadUrl } from "@/lib/storage";
import { logAuditFireAndForget } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";

const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const Body = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  category: z.enum(["bylaws", "fire_safety", "lease", "vendor", "insurance", "maintenance", "other"]),
  visibility: z.enum(["public", "staff_only"]),
});

type Result =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

export async function uploadDocument(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireTeam();
  if (!can(session.appUser, "document.manage")) {
    return { ok: false, error: "Only Building Managers and Facility Managers can upload documents." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = Body.safeParse({
    title: formData.get("title"),
    description: ((formData.get("description") as string) || "").trim() || null,
    category: formData.get("category"),
    visibility: formData.get("visibility"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pick a file to upload." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: "Allowed types: PDF, PNG, JPEG, WebP." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File exceeds the 10 MB limit." };
  }

  // We generate the document ID up front so we can use it as the storage
  // path prefix — keeps storage and DB rows in lockstep even if either
  // half fails partway through.
  const cuid = randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const storagePath = `${session.appUser.buildingId}/${cuid}/${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await putObject(storagePath, buffer, file.type);
  } catch (err) {
    return { ok: false, error: `Upload failed: ${err instanceof Error ? err.message : "storage error"}` };
  }

  try {
    const doc = await prisma.document.create({
      data: {
        id: cuid,
        buildingId: session.appUser.buildingId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        storagePath,
        mimeType: file.type,
        sizeBytes: file.size,
        category: parsed.data.category,
        visibility: parsed.data.visibility,
        uploadedById: session.appUser.id,
      },
    });

    logAuditFireAndForget({
      userId: session.appUser.id,
      userEmail: session.appUser.email,
      action: "document.upload",
      resource: "Document",
      resourceId: doc.id,
      buildingId: session.appUser.buildingId,
      changes: { title: doc.title, category: doc.category, visibility: doc.visibility, sizeBytes: doc.sizeBytes },
    });

    revalidatePath("/team/documents");
    revalidatePath("/dashboard/documents");
    return { ok: true, documentId: doc.id };
  } catch (err) {
    // Prisma write failed after upload — clean up the orphaned object.
    await deleteObject(storagePath).catch(() => {});
    return { ok: false, error: err instanceof Error ? err.message : "Database write failed." };
  }
}

export async function deleteDocument(documentId: string): Promise<Result> {
  const session = await requireTeam();
  if (!can(session.appUser, "document.manage")) {
    return { ok: false, error: "Only Building Managers and Facility Managers can remove documents." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false, error: "Document not found." };
  if (doc.buildingId !== session.appUser.buildingId) {
    return { ok: false, error: "Document doesn't belong to your building." };
  }
  // Soft-delete only — preserves audit trail for LTB / RDL evidence.
  await prisma.document.update({
    where: { id: documentId },
    data: { deletedAt: new Date() },
  });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "document.delete",
    resource: "Document",
    resourceId: doc.id,
    buildingId: session.appUser.buildingId,
    changes: { title: doc.title },
  });

  revalidatePath("/team/documents");
  revalidatePath("/dashboard/documents");
  return { ok: true, documentId: doc.id };
}

// Returns a short-lived signed URL the browser can fetch the file from.
// We re-check the user is in the same building (and authorized for the
// visibility tier) before issuing it.
export async function getDocumentDownloadUrl(documentId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await requireTeam().catch(() => null);
  // requireTeam throws redirect on non-staff — fall through to requireUser
  // for residents/tenants accessing public docs.
  const sess = session ?? await (await import("@/lib/auth")).requireUser();

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.deletedAt) return { ok: false, error: "Document not found." };
  if (doc.buildingId !== sess.appUser.buildingId) return { ok: false, error: "Forbidden." };

  const isStaff = ["building_manager", "facility_manager", "concierge"].includes(sess.appUser.role);
  if (doc.visibility === "staff_only" && !isStaff) {
    return { ok: false, error: "Forbidden." };
  }

  let url: string;
  try {
    url = await getDownloadUrl(doc.storagePath, 60 * 60);
  } catch {
    return { ok: false, error: "Could not generate download link." };
  }

  logAuditFireAndForget({
    userId: sess.appUser.id,
    userEmail: sess.appUser.email,
    action: "document.download",
    resource: "Document",
    resourceId: doc.id,
    buildingId: doc.buildingId,
  });

  return { ok: true, url };
}
