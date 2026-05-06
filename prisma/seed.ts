import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const building = await prisma.building.upsert({
    where: { id: "demo-building-1" },
    update: {},
    create: {
      id: "demo-building-1",
      name: "BuildingSync Demo Tower",
      address: "1 Example Plaza",
      city: "Toronto",
      state: "ON",
      zipCode: "M5V 1A1",
    },
  });

  const unit = await prisma.unit.upsert({
    where: { buildingId_unitNumber: { buildingId: building.id, unitNumber: "101" } },
    update: {},
    create: { buildingId: building.id, unitNumber: "101", floor: 1, rentAmount: "1500.00" },
  });

  console.log(`Seeded: ${building.name} · Unit ${unit.unitNumber} (${unit.id})`);

  const linkEmail = process.argv[2];
  if (linkEmail) {
    const user = await prisma.user.findUnique({ where: { email: linkEmail } });
    if (!user) {
      console.log(`No User row for ${linkEmail}. Sign in once at /signin first so the upsert runs.`);
    } else {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { buildingId: building.id, unitId: unit.id },
      });
      console.log(`Linked ${updated.email} → ${building.name} · Unit ${unit.unitNumber}`);
    }
  } else {
    console.log("No email passed. To link a user run: npx tsx prisma/seed.ts your@email.com");
  }

  // Sample announcement for the smoke test
  const existing = await prisma.announcement.findFirst({ where: { buildingId: building.id } });
  if (!existing) {
    const anyManager = await prisma.user.findFirst({ where: { buildingId: building.id } });
    if (anyManager) {
      await prisma.announcement.create({
        data: {
          buildingId: building.id,
          authorId: anyManager.id,
          title: "Welcome to BuildingSync Demo Tower",
          body: "This is a test announcement seeded for the R1 smoke build. Replace once a Building Manager posts a real one.",
        },
      });
      console.log("Seeded sample announcement.");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
