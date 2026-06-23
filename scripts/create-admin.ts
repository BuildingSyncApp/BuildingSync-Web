// Create (or update) a platform-admin account with a known password — the
// fastest way to get a working login for local / staging testing.
//
// Usage: npx tsx scripts/create-admin.ts <email> <password>
//
// Hashes the password with argon2id (own auth — see lib/auth-core) and
// upserts a Prisma User with role "admin". After it runs, sign in at
// /signin → you land on /platform, and you can use "View as" to preview
// every other portal from this one login.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const [emailArg, password] = process.argv.slice(2);
  if (!emailArg || !password) {
    console.error("Usage: npx tsx scripts/create-admin.ts <email> <password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();

  if (!process.env.DATABASE_URL) {
    console.error("Need DATABASE_URL in .env.local.");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const hash = await argon2.hash(password, { type: argon2.argon2id });

  // Upsert by email: create a fresh admin, or rotate the password + promote
  // an existing account to admin.
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { password: hash, role: "admin", isActive: true, archivedAt: null },
    });
    console.log(`Updated existing user ${email} (password reset, role=admin).`);
  } else {
    await prisma.user.create({
      data: { id: randomUUID(), email, password: hash, role: "admin" },
    });
    console.log(`Created new admin user ${email}.`);
  }

  console.log(`\n✓ ${email} is now a platform admin with the password you supplied.`);
  console.log("  Sign in at /signin → you'll land on /platform.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
