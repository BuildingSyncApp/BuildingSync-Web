"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { logAuditFireAndForget } from "@/lib/audit";

// Server-side Supabase client with the SERVICE_ROLE key — required for
// auth.admin.createUser. Never expose this client to the browser.
function adminSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Building Manager is the only role that can hire staff. FMs run operations
// but don't manage headcount; concierges have no admin powers at all.
const HIRING_ROLES = ["building_manager"];

const Body = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(["facility_manager", "concierge"]),
  name: z.string().trim().max(120).optional().nullable(),
});

type Result =
  | { ok: true; email: string; password: string | null; role: "facility_manager" | "concierge"; message: string }
  | { ok: false; error: string };

export async function addStaff(_prev: unknown, formData: FormData): Promise<Result> {
  const session = await requireTeam();
  if (!HIRING_ROLES.includes(session.appUser.role)) {
    return { ok: false, error: "Only Building Managers can hire facility managers and concierges." };
  }
  if (!session.appUser.buildingId) {
    return { ok: false, error: "Your account is not linked to a building." };
  }

  const parsed = Body.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    name: ((formData.get("name") as string) || "").trim() || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { email, role, name } = parsed.data;

  // Existing user? Re-link to this building & role rather than re-creating —
  // mirrors the residents flow.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const before = { role: existing.role, buildingId: existing.buildingId };
    await prisma.user.update({
      where: { id: existing.id },
      data: { role, buildingId: session.appUser.buildingId, unitId: null, ...(name ? { name } : {}) },
    });
    logAuditFireAndForget({
      userId: session.appUser.id,
      userEmail: session.appUser.email,
      action: "staff.relink",
      resource: "User",
      resourceId: existing.id,
      buildingId: session.appUser.buildingId,
      changes: { before, after: { role, buildingId: session.appUser.buildingId } },
    });
    revalidatePath("/team/staff");
    return { ok: true, email, password: null, role, message: "Re-linked existing account." };
  }

  // New user — create via Supabase admin API. email_confirm:true skips
  // Supabase's own confirmation; we send the branded welcome via Resend.
  const password = generatePassword();
  const supabase = adminSupabase();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user?.id) {
    return { ok: false, error: error?.message || "Supabase didn't return a user id." };
  }

  await prisma.user.create({
    data: {
      id: data.user.id,
      email,
      name: name ?? null,
      role,
      buildingId: session.appUser.buildingId,
    },
  });

  logAuditFireAndForget({
    userId: session.appUser.id,
    userEmail: session.appUser.email,
    action: "staff.create",
    resource: "User",
    resourceId: data.user.id,
    buildingId: session.appUser.buildingId,
    changes: { email, role, name, buildingId: session.appUser.buildingId },
  });

  // Welcome email with temp password + sign-in link.
  const building = await prisma.building.findUnique({
    where: { id: session.appUser.buildingId },
    select: { name: true },
  });
  await sendEmail({
    to: email,
    ...welcomeEmail({ email, password, buildingName: building?.name ?? null, role }),
  });

  revalidatePath("/team/staff");
  return {
    ok: true,
    email,
    password,
    role,
    message: "Staff account created and welcome email sent.",
  };
}

function generatePassword(): string {
  return randomBytes(12).toString("base64").replace(/[+/=lI0Oo]/g, "").slice(0, 14);
}
