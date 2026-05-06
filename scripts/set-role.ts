// Promote/demote a user's role for local testing.
// Usage: npx tsx scripts/set-role.ts <email> <role>
//   roles: resident | tenant | concierge | facility_manager | building_manager
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { PrismaClient, type UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const VALID_ROLES: UserRole[] = ["resident", "tenant", "concierge", "facility_manager", "building_manager"];

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !role) {
    console.error("Usage: npx tsx scripts/set-role.ts <email> <role>");
    console.error(`Roles: ${VALID_ROLES.join(" | ")}`);
    process.exit(1);
  }
  if (!VALID_ROLES.includes(role as UserRole)) {
    console.error(`Invalid role: ${role}`);
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No User with email ${email}. Have they signed in once?`);
    process.exit(1);
  }
  // Staff aren't tied to a specific unit — they manage the whole building.
  const STAFF: UserRole[] = ["building_manager", "facility_manager", "concierge"];
  const clearUnit = STAFF.includes(role as UserRole);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: role as UserRole,
      ...(clearUnit ? { unitId: null } : {}),
    },
  });
  console.log(`${updated.email} → role: ${updated.role}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
