"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

const ProfileBody = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40).nullable(),
});

const PasswordBody = z.object({
  password: z.string().min(8).max(128),
});

type Result = { ok: true } | { ok: false; error: string };

export async function saveProfile(formData: FormData): Promise<Result> {
  const session = await requireUser();
  const parsed = ProfileBody.safeParse({
    name: ((formData.get("name") as string) || "").trim(),
    phone: ((formData.get("phone") as string) || "").trim() || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  await prisma.user.update({
    where: { id: session.appUser.id },
    data: parsed.data,
  });
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/team");
  return { ok: true };
}

export async function savePassword(formData: FormData): Promise<Result> {
  await requireUser();
  const parsed = PasswordBody.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const supabase = await createClient(await cookies());
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
