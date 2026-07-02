import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Idempotent demo seed. Safe to re-run — every create is upsert-guarded
// or first-existence-checked. Creates demo building, 5 units, and (if a
// resident exists in the building) sample work orders + a lease so a
// sales call doesn't see only empty states.
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
      country: "Canada",
      type: "residential",
      timezone: "America/Toronto",
    },
  });

  const unitDefs = [
    { unitNumber: "101", floor: 1, rentAmount: 2200 },
    { unitNumber: "102", floor: 1, rentAmount: 2300 },
    { unitNumber: "201", floor: 2, rentAmount: 2400 },
    { unitNumber: "202", floor: 2, rentAmount: 2500 },
    { unitNumber: "301", floor: 3, rentAmount: 2900 },
  ];
  const units = [];
  for (const u of unitDefs) {
    const unit = await prisma.unit.upsert({
      where: { buildingId_unitNumber: { buildingId: building.id, unitNumber: u.unitNumber } },
      update: {},
      create: { id: `demo-unit-${u.unitNumber}`, buildingId: building.id, ...u },
    });
    units.push(unit);
  }
  console.log(`Seeded: ${building.name} · ${units.length} units`);

  const linkEmail = process.argv[2];
  if (linkEmail) {
    const user = await prisma.user.findUnique({ where: { email: linkEmail } });
    if (!user) {
      console.log(`No User row for ${linkEmail}. Sign in once at /signin first so the upsert runs.`);
    } else {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { buildingId: building.id, unitId: units[0].id },
      });
      console.log(`Linked ${updated.email} → ${building.name} · Unit ${units[0].unitNumber}`);
    }
  } else {
    console.log("No email passed. To link a user run: npx tsx prisma/seed.ts your@email.com");
  }

  // Pick a manager-like user (BM/FM/concierge) for authoring announcements
  // and a resident for opening work orders. Falls back gracefully if the
  // building hasn't been populated yet.
  const manager = await prisma.user.findFirst({
    where: {
      buildingId: building.id,
      role: { in: ["building_manager", "facility_manager", "concierge"] },
    },
  });
  const resident = await prisma.user.findFirst({
    where: { buildingId: building.id, role: { in: ["resident", "tenant"] } },
  });

  // Sample announcement for the smoke test.
  const announcementCount = await prisma.announcement.count({
    where: { buildingId: building.id, deletedAt: null },
  });
  if (announcementCount === 0) {
    const author = manager ?? resident;
    if (author) {
      await prisma.announcement.create({
        data: {
          buildingId: building.id,
          authorId: author.id,
          title: "Elevator maintenance on Saturday",
          body: "Heads up — the south elevator will be out of service Saturday 9am–noon for its quarterly inspection. Please use the north elevator. Thanks for your patience.",
          audience: "all",
        },
      });
      console.log("Seeded sample announcement.");
    }
  }

  // Sample work orders so the team dashboard isn't all empty states.
  if (resident) {
    const workOrderCount = await prisma.workOrder.count({ where: { buildingId: building.id } });
    if (workOrderCount === 0) {
      const samples = [
        {
          status: "open" as const,
          issue: "Leaky kitchen faucet",
          description: "Started yesterday. Slow drip from the cold tap. Towel under sink for now.",
          unit: units[0].unitNumber,
          createdDaysAgo: 1,
        },
        {
          status: "in_progress" as const,
          issue: "Bedroom radiator not heating",
          description: "Radiator in the second bedroom is cold. Living room one is fine. Building thermostat seems normal.",
          unit: units[2].unitNumber,
          createdDaysAgo: 3,
        },
        {
          status: "closed" as const,
          issue: "Hallway light flickering",
          description: "Replaced — was a loose ballast. Closed.",
          unit: units[1].unitNumber,
          createdDaysAgo: 9,
        },
      ];
      for (const s of samples) {
        const created = new Date();
        created.setDate(created.getDate() - s.createdDaysAgo);
        const slaDeadline = new Date(created.getTime() + 72 * 60 * 60 * 1000);
        await prisma.workOrder.create({
          data: {
            id: randomUUID(),
            buildingId: building.id,
            openedById: resident.id,
            assigneeId: manager?.id ?? null,
            issue: s.issue,
            description: s.description,
            status: s.status,
            unit: s.unit,
            priority: "normal",
            slaPolicy: "normal_72h",
            slaDeadline,
            submittedAt: created,
            createdAt: created,
            updatedAt: created,
          },
        });
      }
      console.log(`Seeded ${samples.length} sample work orders.`);
    }
  }

  // Sample active lease if a tenant + unit exist and there's no lease yet.
  if (resident && units[0]) {
    const leaseExists = await prisma.lease.findFirst({
      where: { buildingId: building.id, tenantId: resident.id, archivedAt: null },
    });
    if (!leaseExists) {
      const start = new Date();
      start.setMonth(start.getMonth() - 4);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      await prisma.lease.create({
        data: {
          id: randomUUID(),
          buildingId: building.id,
          tenantId: resident.id,
          unitId: units[0].id,
          leaseStartDate: start,
          leaseEndDate: end,
          rentAmountMonthly: 2200,
          securityDeposit: 2200,
          leaseType: "fixed_term",
          status: "active",
        },
      });
      console.log(`Seeded sample lease for ${resident.email}.`);
    }
  }

  // Sample amenities + a booking today so the staff amenities view and
  // FM dashboard have content on first run.
  const gym = await prisma.amenity.upsert({
    where: { id: "demo-amenity-gym" },
    update: {},
    create: {
      id: "demo-amenity-gym",
      buildingId: building.id,
      name: "Fitness Centre",
      category: "fitness",
      bookingRequired: false,
      capacity: 15,
      openTime: "06:00",
      closeTime: "23:00",
    },
  });
  const partyRoom = await prisma.amenity.upsert({
    where: { id: "demo-amenity-party" },
    update: {},
    create: {
      id: "demo-amenity-party",
      buildingId: building.id,
      name: "Party Room",
      category: "social",
      bookingRequired: true,
      capacity: 40,
      openTime: "10:00",
      closeTime: "23:00",
      slotDurationMinutes: 120,
    },
  });
  if (resident) {
    const hasBooking = await prisma.amenityBooking.findFirst({
      where: { amenityId: partyRoom.id, userId: resident.id },
    });
    if (!hasBooking) {
      const start = new Date();
      start.setHours(18, 0, 0, 0);
      const end = new Date(start);
      end.setHours(20);
      await prisma.amenityBooking.create({
        data: {
          id: randomUUID(),
          amenityId: partyRoom.id,
          userId: resident.id,
          startTime: start,
          endTime: end,
          status: "confirmed",
        },
      });
      console.log(`Seeded a Party Room booking today for ${resident.email}.`);
    }
  }
  console.log(`Seeded amenities: ${gym.name}, ${partyRoom.name}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
