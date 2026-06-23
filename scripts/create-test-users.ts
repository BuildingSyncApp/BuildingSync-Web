// Bulk-create / sync test users for the smoke build.
// Usage: npx tsx scripts/create-test-users.ts [password]
//
// For each test email:
//   - If a Prisma User row already exists, update role + building/unit and
//     rotate the (argon2id) password.
//   - Otherwise, create the Prisma row with an argon2id password hash.
// Own auth (lib/auth-core) — no external auth provider involved.

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { PrismaClient, type UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

// Password is required — no hardcoded default, since a baked-in password
// ends up in git history forever.
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

  const hash = await argon2.hash(PASSWORD, { type: argon2.argon2id });

  for (const u of TEST_USERS) {
    const isResident = u.role === "resident" || u.role === "tenant";
    const linkData = {
      role: u.role,
      buildingId: building.id,
      unitId: isResident && unit ? unit.id : null,
    };

    const existing = await prisma.user.findUnique({ where: { email: u.email } });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { ...linkData, password: hash, isActive: true, archivedAt: null },
      });
      console.log(`${u.email.padEnd(40)} role=${u.role.padEnd(20)} updated + password rotated`);
      continue;
    }

    await prisma.user.create({
      data: { id: randomUUID(), email: u.email, password: hash, ...linkData },
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
