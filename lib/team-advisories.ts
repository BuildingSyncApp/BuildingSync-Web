import "server-only";
import { prisma } from "@/lib/prisma";
import type { AdvisoryItem } from "@/components/AdvisoryBanner";

// Role-scoped advisories for the /team banner. Each item is a live
// operational condition with a deep link to the surface that clears it.
// Ids are day-scoped so a dismissal lasts today and re-surfaces tomorrow
// if the condition still holds (see AdvisoryBanner).
//
// Every query is .catch'd to zero — the banner must never 500 a layout.

const ACTIVE_WO_STATUSES = ["open", "in_progress", "scheduled"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

type TeamUser = {
  role: string;
  buildingId: string | null;
  nextVerificationDue: Date | null;
};

export async function getTeamAdvisories(appUser: TeamUser): Promise<AdvisoryItem[]> {
  if (!appUser.buildingId) return [];
  const buildingId = appUser.buildingId;

  const isBM = appUser.role === "building_manager";
  const isFM = appUser.role === "facility_manager";
  const isConcierge = appUser.role === "concierge";

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const staleCutoff = new Date(now.getTime() - 3 * DAY_MS);
  const leaseHorizon = new Date(now.getTime() + 60 * DAY_MS);

  const [overdueWOs, urgentWOs, pendingVerifications, stalePackages, expiringLeases, severeIncidents] =
    await Promise.all([
      prisma.workOrder
        .count({ where: { buildingId, status: { in: [...ACTIVE_WO_STATUSES] }, slaDeadline: { lt: now } } })
        .catch(() => 0),
      prisma.workOrder
        .count({ where: { buildingId, status: { in: [...ACTIVE_WO_STATUSES] }, priority: "urgent" } })
        .catch(() => 0),
      isBM
        ? prisma.user
            .count({
              where: {
                buildingId,
                verifiedAt: null,
                archivedAt: null,
                role: { in: ["facility_manager", "concierge", "resident", "tenant"] },
              },
            })
            .catch(() => 0)
        : 0,
      isBM || isConcierge
        ? prisma.delivery
            .count({ where: { buildingId, status: "pending", receivedAt: { lt: staleCutoff } } })
            .catch(() => 0)
        : 0,
      isBM
        ? prisma.lease
            .count({
              where: { buildingId, archivedAt: null, leaseEndDate: { gte: now, lte: leaseHorizon } },
            })
            .catch(() => 0)
        : 0,
      isBM || isFM
        ? prisma.incident
            .count({ where: { buildingId, status: "open", severity: { in: ["high", "urgent"] } } })
            .catch(() => 0)
        : 0,
    ]);

  const items: AdvisoryItem[] = [];

  if (urgentWOs > 0) {
    items.push({
      id: `wo-urgent-${day}`,
      tone: "critical",
      title: `${urgentWOs} urgent work order${urgentWOs === 1 ? "" : "s"} open`,
      body: "Urgent issues affect habitability and carry the tightest SLA.",
      href: "/team/work-orders",
      hrefLabel: "Triage now",
    });
  }

  if (overdueWOs > 0) {
    items.push({
      id: `wo-overdue-${day}`,
      tone: "warning",
      title: `${overdueWOs} work order${overdueWOs === 1 ? " is" : "s are"} past the SLA deadline`,
      body: "Overdue maintenance is the #1 driver of resident complaints and LTB filings.",
      href: "/team/work-orders",
      hrefLabel: "View queue",
    });
  }

  if (severeIncidents > 0) {
    items.push({
      id: `incident-severe-${day}`,
      tone: "critical",
      title: `${severeIncidents} high-severity incident${severeIncidents === 1 ? "" : "s"} open`,
      body: "Review and resolve, or downgrade severity if contained.",
      href: "/team/incidents",
      hrefLabel: "Open incidents",
    });
  }

  if (pendingVerifications > 0) {
    items.push({
      id: `verify-pending-${day}`,
      tone: "info",
      title: `${pendingVerifications} account${pendingVerifications === 1 ? "" : "s"} waiting for verification`,
      body: "New residents and staff can't use their portal until you approve them.",
      href: "/team/access-requests",
      hrefLabel: "Review requests",
    });
  }

  if (stalePackages > 0) {
    items.push({
      id: `packages-stale-${day}`,
      tone: "info",
      title: `${stalePackages} package${stalePackages === 1 ? "" : "s"} waiting over 3 days`,
      body: "Nudge recipients or check the pickup shelf.",
      href: "/team/packages",
      hrefLabel: "See packages",
    });
  }

  if (expiringLeases > 0) {
    items.push({
      id: `leases-expiring-${day}`,
      tone: "info",
      title: `${expiringLeases} lease${expiringLeases === 1 ? "" : "s"} ending within 60 days`,
      body: "Start renewal conversations early to avoid vacancy gaps.",
      href: "/team/residents",
      hrefLabel: "View residents",
    });
  }

  // BM company re-verification — mirrors the old standalone banner's
  // escalation (info ≤60d, warning ≤30d, critical overdue).
  if (isBM && appUser.nextVerificationDue) {
    const daysOut = Math.round((appUser.nextVerificationDue.getTime() - now.getTime()) / DAY_MS);
    if (daysOut <= 60) {
      items.push({
        id: `reverification-${day}`,
        tone: daysOut < 0 ? "critical" : daysOut <= 30 ? "warning" : "info",
        title:
          daysOut < 0
            ? `Company re-verification overdue by ${Math.abs(daysOut)} day${Math.abs(daysOut) === 1 ? "" : "s"}`
            : `Company re-verification due in ${daysOut} day${daysOut === 1 ? "" : "s"}`,
        body: "Keep your CMRAO licence and insurance proof current so building records stay defensible.",
        href: "/team/verification",
        hrefLabel: "Verification status",
      });
    }
  }

  // Most severe first; the banner opens on items[0].
  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return items.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
