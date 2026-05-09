import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User as AuthUser } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User as AppUser } from "@prisma/client";

// Reads the Supabase session, then upserts the app-side User row keyed by
// the Supabase auth.uid. New signups land here as `resident` with no
// building/unit until a Building Manager assigns them.
export async function getOrCreateAppUser(): Promise<{ authUser: AuthUser; appUser: AppUser } | null> {
  const supabase = await createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  const appUser = await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email },
    create: { id: user.id, email: user.email, role: "resident" },
  });

  return { authUser: user, appUser };
}

export async function requireUser() {
  const result = await getOrCreateAppUser();
  if (!result) redirect("/signin");
  return result;
}
