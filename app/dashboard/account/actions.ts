"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth-core";
import { logAuditFireAndForget } from "@/lib/audit";
import {
  detectPostalKind,
  normalizeCanadian,
  validatePostalAgainstRegion,
} from "@/lib/postal";

const ProfileBody = z.object({
  name: z.string().trim().max(100).nullable(),
  phone: z.string().trim().max(40).nullable(),
});

// Region body — separate action so users can change one without
// blanking the other. Postal optional but if present, format and
// region cross-check apply.
const RegionBody = z.object({
  region: z.string().trim().min(2).max(16),
  postalCode: z.string().trim().max(20).nullable(),
  city: z.string().trim().max(80).nullable(),
});

const PasswordBody = z.object({
  currentPassword: z.string().min(1).max(128),
  password: z.string().min(8).max(128),
});

type Result = { ok: true; message: string } | { ok: false; error: string };

export async function updateProfile(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireUser();
  const parsed = ProfileBody.safeParse({
    name: ((formData.get("name") as string) || "").trim() || null,
    phone: ((formData.get("phone") as string) || "").trim() || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  await prisma.user.update({
    where: { id: session.appUser.id },
    data: parsed.data,
  });
  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard");
  return { ok: true, message: "Profile saved." };
}

export async function updatePassword(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireUser();
  const parsed = PasswordBody.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues.find((i) => i.path[0] === "password")
          ? "New password must be at least 8 characters."
          : "Current password is required.",
    };
  }
  if (parsed.data.currentPassword === parsed.data.password) {
    return { ok: false, error: "New password must differ from current password." };
  }

  // Verify the current password against our own argon2 hash, then rotate.
  const record = await prisma.user.findUnique({
    where: { id: session.appUser.id },
    select: { password: true },
  });
  if (!record?.password) {
    // Account was provisioned via invite and never set a password — direct
    // them to the reset flow instead of an in-app change.
    return { ok: false, error: "No password is set for this account. Use “Forgot password” to set one." };
  }
  const valid = await verifyPassword(record.password, parsed.data.currentPassword);
  if (!valid) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const password = await hashPassword(parsed.data.password);
  await prisma.user.update({ where: { id: session.appUser.id }, data: { password } });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.authUser.email,
    action: "auth.password_change",
    resource: "User",
    resourceId: session.appUser.id,
  });

  return { ok: true, message: "Password updated." };
}

export async function updateRegion(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireUser();
  const parsed = RegionBody.safeParse({
    region: formData.get("region"),
    postalCode: ((formData.get("postalCode") as string) || "").trim() || null,
    city: ((formData.get("city") as string) || "").trim() || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  let { postalCode } = parsed.data;
  if (postalCode) {
    const kind = detectPostalKind(postalCode);
    if (kind === "invalid") {
      return { ok: false, error: "Postal code format doesn't look right." };
    }
    if (kind === "ca") {
      postalCode = normalizeCanadian(postalCode);
      const issue = validatePostalAgainstRegion(postalCode, parsed.data.region);
      if (issue && issue.kind === "region_mismatch") {
        return {
          ok: false,
          error: `${issue.message} Update either field, or switch region to ${issue.suggestedRegion}.`,
        };
      }
    }
  }
  await prisma.user.update({
    where: { id: session.appUser.id },
    data: {
      region: parsed.data.region,
      postalCode,
      city: parsed.data.city,
    },
  });
  revalidatePath("/dashboard/account");
  revalidatePath("/legal");
  return { ok: true, message: "Region updated." };
}
