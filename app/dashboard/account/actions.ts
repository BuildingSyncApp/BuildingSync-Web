"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ProfileBody = z.object({
  name: z.string().trim().max(100).nullable(),
  phone: z.string().trim().max(40).nullable(),
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
  // Step 1 — verify current password by re-authenticating against Supabase.
  // Use a fresh client (no shared cookie store) so this signin doesn't
  // mutate the live session; we only need the success/failure signal.
  const verifyClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: session.authUser.email!,
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return { ok: false, error: "Current password is incorrect." };
  }
  // Step 2 — perform the update via the service-role admin API. Supabase's
  // user-scoped updateUser rejects password changes when "Secure password
  // change" is on, even after a fresh signInWithPassword in the same
  // server action — the cookie-bound session it operates against is the
  // pre-existing one. Admin-API path bypasses that constraint, and we've
  // already gated it on a successful current-password verification above.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return { ok: false, error: "Server is not configured to rotate passwords. Contact support." };
  }
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await adminClient.auth.admin.updateUserById(session.authUser.id, {
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Password updated." };
}
