import "server-only";
import { prisma } from "@/lib/prisma";
import type { AdvisoryItem } from "@/components/AdvisoryBanner";

// Role-scoped advisories for the resident /dashboard banner — the same
// rotating pattern as /team but tuned to what a resident/tenant needs to
// act on: packages on the shelf, rent coming due (tenants), and their
// own work orders changing state. Day-scoped ids like team-advisories.
//
// Every query is .catch'd — the banner must never 500 a layout.

const DAY_MS = 24 * 60 * 60 * 1000;

type ResidentUser = {
  id: string;
  role: string;
  buildingId: string | null;
  unitId: string | null;
};

// Rent falls due on the lease-start day-of-month; mirror of the logic on
// the dashboard page.
function nextRentDue(lease: { leaseStartDate: Date; leaseEndDate: Date }, now: Date): Date | null {
  const candidate = new Date(now.getFullYear(), now.getMonth(), lease.leaseStartDate.getDate());
  if (candidate < now) candidate.setMonth(candidate.getMonth() + 1);
  if (candidate > lease.leaseEndDate) return null;
  return candidate;
}

export async function getResidentAdvisories(appUser: ResidentUser): Promise<AdvisoryItem[]> {
  if (!appUser.buildingId) return [];
  const now = new Date();
  const day = now.toISOString().slice(0, 10);

  const [pendingDeliveries, activeLease, scheduledWorkOrders] = await Promise.all([
    prisma.delivery
      .count({ where: { recipientUserId: appUser.id, status: "pending" } })
      .catch(() => 0),
    appUser.role === "tenant"
      ? prisma.lease
          .findFirst({
            where: {
              tenantId: appUser.id,
              archivedAt: null,
              leaseStartDate: { lte: now },
              leaseEndDate: { gte: now },
            },
            select: { leaseStartDate: true, leaseEndDate: true, rentAmountMonthly: true },
          })
          .catch(() => null)
      : null,
    prisma.workOrder
      .count({ where: { openedById: appUser.id, status: "scheduled" } })
      .catch(() => 0),
  ]);

  const items: AdvisoryItem[] = [];

  if (pendingDeliveries > 0) {
    items.push({
      id: `delivery-${day}`,
      tone: "info",
      title: `${pendingDeliveries} package${pendingDeliveries === 1 ? "" : "s"} waiting for you`,
      body: "Pick up at the front desk with your pickup code.",
      href: "/dashboard/deliveries",
      hrefLabel: "View pickup code",
    });
  }

  if (activeLease) {
    const due = nextRentDue(activeLease, now);
    if (due) {
      const daysOut = Math.round((due.getTime() - now.getTime()) / DAY_MS);
      if (daysOut <= 5) {
        items.push({
          id: `rent-${day}`,
          tone: daysOut <= 1 ? "warning" : "info",
          title: daysOut <= 0 ? "Rent is due today" : `Rent due in ${daysOut} day${daysOut === 1 ? "" : "s"}`,
          body: "Pay online and keep the receipt trail in one place.",
          href: "/dashboard/payments",
          hrefLabel: "Pay rent",
        });
      }
    }
  }

  if (scheduledWorkOrders > 0) {
    items.push({
      id: `wo-scheduled-${day}`,
      tone: "info",
      title: `${scheduledWorkOrders} maintenance visit${scheduledWorkOrders === 1 ? "" : "s"} scheduled`,
      body: "Check the date so someone can provide access to your unit.",
      href: "/dashboard/maintenance",
      hrefLabel: "See schedule",
    });
  }

  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return items.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
