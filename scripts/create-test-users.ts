// Bulk-create / sync test users for the smoke build.
// Usage: npx tsx scripts/create-test-users.ts [password]
//
// For each test email:
//   - If a Prisma User row already exists, just update role + building/unit.
//   - Otherwise, sign the user up via Supabase Auth and create the Prisma row.
//
// If "Confirm email" is still ON in Supabase, new sign-ups will be in pending
// state. Disable it in Auth → Providers → Email for clean creation.

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PrismaClient, type UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

// Service-role client for admin-only operations (password rotation on
// existing users). Falls back to null if service key isn't set, in
// which case the script can still create new users but won't reset
// existing passwords.
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )
  : null;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const TEST_USERS: Array<{ email: string; role: UserRole }> = [
  { email: "sinhaankur827+bm@gmail.com", role: "building_manager" },
  { email: "sinhaankur827+fm@gmail.com", role: "facility_manager" },
  { email: "sinhaankur827+concierge@gmail.com", role: "concierge" },
  { email: "sinhaankur827+resident@gmail.com", role: "resident" },
  { email: "sinhaankur827+tenant@gmail.com", role: "tenant" },
];

// Password is required — no hardcoded default, since these test accounts
// exist in production Supabase and a baked-in password ends up in git
// history forever.
const PASSWORD = process.argv[2] || process.env.TEST_USER_PASSWORD;

async function main() {
  if (!PASSWORD) {
    console.error("Password required. Pass as first arg or set TEST_USER_PASSWORD in env.");
    console.error("  npx tsx scripts/create-test-users.ts <password>");
    process.exit(1);
  }
  const building = await prisma.building.findFirst({ orderBy: { createdAt: "asc" } });
  if (!building) {
    console.error("No building found. Run: npx tsx prisma/seed.ts");
    process.exit(1);
  }
  const unit = await prisma.unit.findFirst({ where: { buildingId: building.id } });

  for (const u of TEST_USERS) {
    const isResident = u.role === "resident" || u.role === "tenant";
    const linkData = {
      role: u.role,
      buildingId: building.id,
      unitId: isResident && unit ? unit.id : null,
    };

    const existing = await prisma.user.findUnique({ where: { email: u.email } });

    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: linkData });
      // Also rotate the Supabase Auth password if a service-role client
      // is configured. Without this, existing test users keep their
      // original (possibly leaked) password forever.
      let pwNote = "";
      if (supabaseAdmin) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password: PASSWORD,
        });
        pwNote = error ? ` (password rotate FAILED: ${error.message})` : " + password rotated";
      } else {
        pwNote = " (password NOT rotated — set SUPABASE_SERVICE_ROLE_KEY to enable)";
      }
      console.log(`${u.email.padEnd(40)} role=${u.role.padEnd(20)} updated${pwNote}`);
      continue;
    }

    const { data, error } = await supabase.auth.signUp({ email: u.email, password: PASSWORD });
    if (error) {
      console.error(`${u.email}: ${error.message}`);
      continue;
    }
    if (!data.user?.id) {
      console.warn(`${u.email}: no user id from Supabase (rate limit or confirmation pending)`);
      continue;
    }

    await prisma.user.create({
      data: { id: data.user.id, email: u.email, ...linkData },
    });
    console.log(`${u.email.padEnd(40)} role=${u.role.padEnd(20)} created`);
  }

  console.log("\nDone. Use the password you supplied to sign in as each test account.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
