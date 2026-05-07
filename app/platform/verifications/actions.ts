"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";

const Body = z.object({
  userId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
});

type Result = { ok: true; decision: "approve" | "reject" } | { ok: false; error: string };

export async function decideVerification(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requirePlatformAdmin();

  const parsed = Body.safeParse({
    userId: formData.get("userId"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { userId, decision } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, verifiedAt: true, archivedAt: true },
  });
  if (!target) return { ok: false, error: "User not found." };
  if (target.role !== "building_manager") {
    return { ok: false, error: "Only Building Manager accounts go through verification." };
  }

  if (decision === "approve") {
    await prisma.user.update({
      where: { id: userId },
      data: { verifiedAt: new Date() },
    });
    logAuditFireAndForget({
      userId: session.appUser.id,
      userEmail: session.appUser.email,
      action: "user.verify",
      resource: "User",
      resourceId: userId,
      changes: { email: target.email, role: target.role },
    });
  } else {
    // Reject = soft-archive. We keep the row for audit, mark as archived,
    // and leave verifiedAt null so they can never reach /team. They'll see
    // the pending page on next sign-in (which is fine — they were rejected).
    await prisma.user.update({
      where: { id: userId },
      data: { archivedAt: new Date(), archiveReason: "verification_rejected" },
    });
    logAuditFireAndForget({
      userId: session.appUser.id,
      userEmail: session.appUser.email,
      action: "user.verify_reject",
      resource: "User",
      resourceId: userId,
      changes: { email: target.email, role: target.role },
    });
  }

  revalidatePath("/platform");
  revalidatePath("/platform/verifications");
  return { ok: true, decision };
}
