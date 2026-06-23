"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";
import { logAuditFireAndForget } from "@/lib/audit";

// Server actions for per-building policy management. Every action re-checks
// requireTeam + policy.manage + the impersonation write-guard, and scopes
// writes to the caller's building (the Wall-3 invariant — see
// docs/security-model.md). The building team owns the text and the publish
// decision; AI only assists via /api/ai/policy-assist.

const POLICY_CATEGORIES = [
  "pets", "noise", "amenities", "parking", "smoking", "short_term_rental", "safety", "general",
] as const;

const UpsertBody = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(3).max(120),
  category: z.enum(POLICY_CATEGORIES).default("general"),
  body: z.string().trim().min(20).max(8000),
  aiAssisted: z.boolean().default(false),
});

type Result = { ok: true; message: string } | { ok: false; error: string };

type TeamSession = NonNullable<Awaited<ReturnType<typeof requireTeam>>>;
type GuardOk = { session: TeamSession; error?: undefined };
type GuardErr = { error: string; session?: undefined };

async function guard(): Promise<GuardOk | GuardErr> {
  const session = await requireTeam();
  if (!can(session.appUser, "policy.manage")) {
    return { error: "Only the Building Manager can manage policies." };
  }
  const impBlock = await impersonationWriteGuard();
  if (impBlock) return { error: impBlock };
  if (!session.appUser.buildingId) return { error: "No building on your account." };
  return { session };
}

export async function savePolicy(_prev: unknown, formData: FormData): Promise<Result> {
  const g = await guard();
  if (!g.session) return { ok: false, error: g.error };
  const { appUser } = g.session;

  const parsed = UpsertBody.safeParse({
    id: (formData.get("id") as string) || undefined,
    title: formData.get("title"),
    category: formData.get("category"),
    body: formData.get("body"),
    aiAssisted: formData.get("aiAssisted") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  if (data.id) {
    // Edit — scope the update to this building so a forged id can't touch
    // another building's policy.
    const existing = await prisma.policy.findFirst({
      where: { id: data.id, buildingId: appUser.buildingId! },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Policy not found." };
    await prisma.policy.update({
      where: { id: data.id },
      data: { title: data.title, category: data.category, body: data.body, aiAssisted: data.aiAssisted },
    });
    logAuditFireAndForget({
      userId: appUser.id, userEmail: appUser.email, buildingId: appUser.buildingId,
      action: "policy.update", resource: "Policy", resourceId: data.id,
      changes: { title: data.title, category: data.category },
    });
  } else {
    const id = randomUUID();
    await prisma.policy.create({
      data: {
        id, buildingId: appUser.buildingId!, title: data.title, category: data.category,
        body: data.body, aiAssisted: data.aiAssisted, createdById: appUser.id, status: "draft",
      },
    });
    logAuditFireAndForget({
      userId: appUser.id, userEmail: appUser.email, buildingId: appUser.buildingId,
      action: "policy.create", resource: "Policy", resourceId: id,
      changes: { title: data.title, category: data.category, aiAssisted: data.aiAssisted },
    });
  }

  revalidatePath("/team/policies");
  return { ok: true, message: data.id ? "Policy saved." : "Policy created." };
}

const StatusBody = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["draft", "published", "archived"]),
});

export async function setPolicyStatus(_prev: unknown, formData: FormData): Promise<Result> {
  const g = await guard();
  if (!g.session) return { ok: false, error: g.error };
  const { appUser } = g.session;

  const parsed = StatusBody.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { id, status } = parsed.data;

  const existing = await prisma.policy.findFirst({
    where: { id, buildingId: appUser.buildingId! },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Policy not found." };

  await prisma.policy.update({
    where: { id },
    data: { status, publishedAt: status === "published" ? new Date() : null },
  });
  logAuditFireAndForget({
    userId: appUser.id, userEmail: appUser.email, buildingId: appUser.buildingId,
    action: `policy.${status}`, resource: "Policy", resourceId: id,
  });

  revalidatePath("/team/policies");
  return {
    ok: true,
    message: status === "published" ? "Policy published." : status === "archived" ? "Policy archived." : "Policy moved to draft.",
  };
}
