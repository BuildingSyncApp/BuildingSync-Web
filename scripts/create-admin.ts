// Create (or update) a CONFIRMED platform-admin account with a known
// password — the fastest way to get a working login for local / staging
// testing without juggling email confirmation or the Supabase dashboard.
//
// Usage: npx tsx scripts/create-admin.ts <email> <password>
//
// Uses the service-role admin API (email_confirm:true) so the account can
// sign in immediately, then sets the Prisma User.role to "admin". After it
// runs, sign in at /signin → you land on /platform, and you can use
// "View as" to preview every other portal from this one login.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npx tsx scripts/create-admin.ts <email> <password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  // Create the confirmed auth user, or locate + rotate the password if the
  // email already exists.
  let userId: string;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.data.user?.id) {
    userId = created.data.user.id;
    console.log(`Created Supabase auth user ${email}.`);
  } else {
    // Already exists — find by email and reset the password.
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) {
      console.error(`Could not create or find ${email}: ${created.error?.message ?? "unknown error"}`);
      process.exit(1);
    }
    userId = found.id;
    const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (error) {
      console.error(`Found ${email} but failed to set password: ${error.message}`);
      process.exit(1);
    }
    console.log(`Updated existing Supabase auth user ${email} (password reset).`);
  }

  // Mirror as a Prisma User with role=admin (keyed by the same uuid).
  await prisma.user.upsert({
    where: { id: userId },
    update: { email, role: "admin", unitId: null },
    create: { id: userId, email, role: "admin" },
  });

  console.log(`\n✓ ${email} is now a platform admin with the password you supplied.`);
  console.log("  Sign in at /signin → you'll land on /platform.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
