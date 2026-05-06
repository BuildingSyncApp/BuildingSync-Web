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

const PASSWORD = process.argv[2] || "BuildingSync!2026";

async function main() {
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
      console.log(`${u.email.padEnd(40)} role=${u.role.padEnd(20)} updated`);
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

  console.log(`\nAll passwords: ${PASSWORD}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
