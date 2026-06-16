import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { User as AuthUser } from "@supabase/supabase-js";
import { getOrCreateAppUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { User as AppUser } from "@prisma/client";
import type { ImpersonationSession } from "@/lib/impersonation";

// Unified auth resolver for API routes that need to support both the web
// app (cookie-based Supabase session) and native clients (Authorization:
// Bearer <jwt>). Web routes that only need cookie auth can keep using
// getOrCreateAppUser directly; routes exposed to mobile should call this.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function resolveBearer(token: string): Promise<{ authUser: AuthUser; appUser: AppUser } | null> {
  if (!supabaseUrl || !supabaseKey) return null;
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.auth.getUser(token);
  const user = data?.user;
  const email = user?.email;
  if (error || !user || !email) return null;
  const appUser = await prisma.user.upsert({
    where: { id: user.id },
    update: { email },
    create: { id: user.id, email, role: "resident" },
  });
  return { authUser: user, appUser };
}

export async function getApiUser(
  request: Request,
): Promise<{ authUser: AuthUser; appUser: AppUser; impersonation?: ImpersonationSession } | null> {
  const auth = request.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    // Native/mobile bearer path NEVER impersonates — impersonation is a
    // cookie-only, admin-web concern. Resolve and return immediately.
    const token = auth.slice(7).trim();
    if (token) return resolveBearer(token);
    return null;
  }
  // Cookie path: getOrCreateAppUser applies any active impersonation swap.
  return getOrCreateAppUser();
}
