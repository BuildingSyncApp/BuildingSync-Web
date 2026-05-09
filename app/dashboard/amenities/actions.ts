"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";

// Server action for creating an AmenityBooking. The amenity's
// openTime/closeTime + advanceNoticeHours are enforced server-side so
// clients can't bypass the rules. Conflict detection: overlapping
// non-cancelled bookings for the same amenity → reject.

export type BookingResult =
  | { ok: true; bookingId: string; status: "pending" | "confirmed" }
  | { ok: false; error: string };

function parseLocalDateTime(date: string, time: string): Date | null {
  // Inputs are HTML <input type="date"/time"> values: "YYYY-MM-DD" and "HH:MM".
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m || !t) return null;
  const dt = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(t[1]),
    Number(t[2]),
    0,
    0,
  );
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function timeStringToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export async function createAmenityBooking(formData: FormData): Promise<BookingResult> {
  const { authUser, appUser } = await requireUser();

  if (!appUser.buildingId) {
    return { ok: false, error: "Your account isn't linked to a building yet." };
  }

  const amenityId = String(formData.get("amenityId") || "");
  const date = String(formData.get("date") || "");
  const startTime = String(formData.get("startTime") || "");
  const endTime = String(formData.get("endTime") || "");
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!amenityId || !date || !startTime || !endTime) {
    return { ok: false, error: "Missing required fields." };
  }

  const amenity = await prisma.amenity.findUnique({ where: { id: amenityId } });
  if (!amenity) return { ok: false, error: "Amenity not found." };
  if (amenity.buildingId !== appUser.buildingId) {
    return { ok: false, error: "That amenity isn't in your building." };
  }
  if (!amenity.isActive) {
    return { ok: false, error: "That amenity isn't currently bookable." };
  }

  const start = parseLocalDateTime(date, startTime);
  const end = parseLocalDateTime(date, endTime);
  if (!start || !end) return { ok: false, error: "Invalid date or time." };
  if (end <= start) return { ok: false, error: "End time must be after start time." };

  const now = new Date();
  if (start < now) return { ok: false, error: "Cannot book a time in the past." };

  const advanceMs = amenity.advanceNoticeHours * 60 * 60 * 1000;
  if (advanceMs > 0 && start.getTime() - now.getTime() < advanceMs) {
    return {
      ok: false,
      error: `This amenity needs at least ${amenity.advanceNoticeHours}h advance notice.`,
    };
  }

  // Open/close window check: compare requested HH:MM against the
  // amenity's openTime/closeTime strings.
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const openMin = timeStringToMinutes(amenity.openTime);
  const closeMin = timeStringToMinutes(amenity.closeTime);
  if (startMin < openMin || endMin > closeMin) {
    return {
      ok: false,
      error: `Bookings must be between ${amenity.openTime} and ${amenity.closeTime}.`,
    };
  }

  if (amenity.maxBookingDurationMinutes) {
    const minutes = (end.getTime() - start.getTime()) / 60000;
    if (minutes > amenity.maxBookingDurationMinutes) {
      return {
        ok: false,
        error: `Maximum booking duration is ${amenity.maxBookingDurationMinutes} minutes.`,
      };
    }
  }

  // Conflict check: any overlapping non-cancelled booking on the same amenity.
  const conflict = await prisma.amenityBooking.findFirst({
    where: {
      amenityId,
      status: { in: ["pending", "confirmed"] },
      AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
    },
    select: { id: true },
  });
  if (conflict) {
    return { ok: false, error: "That slot conflicts with another booking. Pick a different time." };
  }

  const status = amenity.approvalPolicy === "auto_approve" ? "confirmed" : "pending";
  const bookingId = randomUUID();

  await prisma.amenityBooking.create({
    data: {
      id: bookingId,
      amenityId,
      userId: appUser.id,
      startTime: start,
      endTime: end,
      status,
      notes,
    },
  });

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "amenity_booking_create",
    resource: "AmenityBooking",
    resourceId: bookingId,
    changes: { amenityId, startTime: start.toISOString(), endTime: end.toISOString(), status },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/amenities");
  redirect("/dashboard/amenities?booked=1");
}
