import "server-only";
import type { Announcement, Building, Delivery, Payment, WorkOrder } from "@prisma/client";

// Mappers from Prisma rows to the wire shapes defined in public/openapi.yaml
// (Delivery, MaintenanceRequest, PaymentInfo, Building, Announcement). Kept in
// one place so every /api/me/* route — and the aggregate /api/me/building —
// stay consistent with the published contract.

export function toWireBuilding(b: Pick<Building, "id" | "name" | "address" | "city">) {
  return {
    id: b.id,
    name: b.name,
    address: b.address ?? null,
    city: b.city ?? null,
    // No registry column on Building today; the contract allows null.
    registry: null as string | null,
  };
}

export function toWireAnnouncement(a: Pick<Announcement, "id" | "buildingId" | "authorId" | "title" | "body" | "createdAt">) {
  return {
    id: a.id,
    buildingId: a.buildingId,
    authorId: a.authorId,
    title: a.title,
    body: a.body,
    createdAt: a.createdAt.toISOString(),
  };
}

// Delivery DB status is "pending" | "picked_up" | ...; the wire contract uses
// "ready" | "picked_up". Anything not picked up reads as ready-for-pickup.
export function toWireDelivery(d: Pick<Delivery, "id" | "sender" | "description" | "pickupCode" | "receivedAt" | "status">) {
  return {
    id: d.id,
    from: d.sender ?? null,
    description: d.description ?? null,
    arrivedAt: d.receivedAt ? d.receivedAt.toISOString() : null,
    code: d.pickupCode ?? null,
    status: d.status === "picked_up" ? "picked_up" : "ready",
  };
}

// Maintenance requests are WorkOrders the user opened. WorkOrder.issue is the
// title; status maps straight through (open|in_progress|scheduled|completed|
// closed) — the wire enum keeps open/in_progress/scheduled and folds the
// terminal states into "resolved".
export function toWireMaintenance(
  w: Pick<WorkOrder, "id" | "issue" | "status" | "createdAt"> & { area?: string | null; lastUpdate?: string | null },
) {
  const status =
    w.status === "completed" || w.status === "closed" ? "resolved" : (w.status as "open" | "in_progress" | "scheduled");
  return {
    id: w.id,
    title: w.issue,
    area: w.area ?? null,
    status,
    submittedAt: w.createdAt.toISOString(),
    lastUpdate: w.lastUpdate ?? null,
  };
}

export function toWirePayment(p: Pick<Payment, "amount" | "currency" | "status" | "paidAt"> | null) {
  if (!p) return null;
  return {
    amountDue: p.status === "paid" ? 0 : p.amount,
    currency: p.currency,
    // The Payment model has no explicit due-date/autopay columns yet; the
    // contract allows nulls so clients render gracefully until billing lands.
    dueDate: null as string | null,
    daysUntilDue: null as number | null,
    autopay: false,
  };
}
