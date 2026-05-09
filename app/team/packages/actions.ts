"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";
import { sendPushToUser } from "@/lib/push";

const LOGGING_ROLES = ["concierge", "building_manager"];

// 4-digit pickup code prefixed with B (e.g. "B-2244"). Concierge
// reads it back to the resident at pickup time.
function generatePickupCode(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `B-${n}`;
}

const LogBody = z.object({
  recipientUserId: z.string().min(1),
  sender: z.string().trim().min(1).max(120),
  description: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type DeliveryResult =
  | { ok: true; pickupCode: string }
  | { ok: false; error: string };

export async function logDelivery(formData: FormData): Promise<DeliveryResult> {
  const { authUser, appUser } = await requireTeam();
  if (!LOGGING_ROLES.includes(appUser.role)) {
    return { ok: false, error: "Only Concierge and Building Manager can log packages." };
  }
  if (!appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = LogBody.safeParse({
    recipientUserId: formData.get("recipientUserId"),
    sender: formData.get("sender"),
    description: ((formData.get("description") as string) || "").trim() || null,
    notes: ((formData.get("notes") as string) || "").trim() || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  // Recipient must live in the same building.
  const recipient = await prisma.user.findUnique({
    where: { id: parsed.data.recipientUserId },
    select: { id: true, buildingId: true, isActive: true, name: true, email: true },
  });
  if (!recipient || recipient.buildingId !== appUser.buildingId || !recipient.isActive) {
    return { ok: false, error: "Recipient is not a resident in this building." };
  }

  const id = randomUUID();
  const pickupCode = generatePickupCode();
  await prisma.delivery.create({
    data: {
      id,
      buildingId: appUser.buildingId,
      recipientUserId: recipient.id,
      loggedById: appUser.id,
      sender: parsed.data.sender,
      description: parsed.data.description,
      pickupCode,
      notes: parsed.data.notes,
    },
  });

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "delivery.log",
    resource: "Delivery",
    resourceId: id,
    changes: {
      recipientId: recipient.id,
      sender: parsed.data.sender,
      pickupCode,
    },
  });

  // Push to the recipient. Pickup code is in the body so they can
  // glance the notification + go straight to the desk.
  void sendPushToUser(recipient.id, {
    title: "Package waiting for pickup",
    body: `${parsed.data.sender} · code ${pickupCode}`,
    url: "/dashboard/deliveries",
    tag: `delivery-${id}`,
  }).catch((err) => console.error("[packages/log] push failed", err));

  revalidatePath("/team/packages");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/deliveries");
  return { ok: true, pickupCode };
}

export async function markDeliveryPickedUp(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const { authUser, appUser } = await requireTeam();
  if (!LOGGING_ROLES.includes(appUser.role)) {
    return { ok: false, error: "Only Concierge and Building Manager can mark packages picked up." };
  }
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Missing delivery id." };

  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery || delivery.buildingId !== appUser.buildingId) {
    return { ok: false, error: "Delivery not found in your building." };
  }

  await prisma.delivery.update({
    where: { id },
    data: { status: "picked_up", pickedUpAt: new Date() },
  });

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "delivery.picked_up",
    resource: "Delivery",
    resourceId: id,
  });

  revalidatePath("/team/packages");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/deliveries");
  return { ok: true };
}
