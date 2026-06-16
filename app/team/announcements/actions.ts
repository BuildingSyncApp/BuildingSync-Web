"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";

const Body = z.object({
  announcementId: z.string().min(1),
});

type Result = { ok: true } | { ok: false; error: string };

// Soft-delete an announcement so it stops showing in resident feeds
// and the BM list. Audit-logged so a tenant disputing whether a notice
// was posted can still see when (and by whom) it was retracted.
export async function deleteAnnouncement(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireTeam();
  if (!can(session.appUser, "announcement.delete")) {
    return { ok: false, error: "Only Building Managers can delete announcements." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { ok: false, error: impBlock };
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = Body.safeParse({ announcementId: formData.get("announcementId") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { announcementId } = parsed.data;

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { id: true, buildingId: true, title: true, deletedAt: true },
  });
  if (!announcement || announcement.buildingId !== session.appUser.buildingId) {
    return { ok: false, error: "Announcement not found in your building." };
  }
  if (announcement.deletedAt) return { ok: true };

  await prisma.announcement.update({
    where: { id: announcementId },
    data: { deletedAt: new Date() },
  });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "announcement.delete",
    resource: "Announcement",
    resourceId: announcementId,
    buildingId: session.appUser.buildingId,
    changes: { title: announcement.title },
  });

  revalidatePath("/team/announcements");
  revalidatePath("/dashboard/announcements");
  return { ok: true };
}
