import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { roleLabel } from "@/components/RoleBadge";
import { formatRelative } from "@/lib/format";

// BM-only review surface for "who has access to this building".
// Surfaces three queues:
//   1. Pending verifications — accounts in this building with
//      verifiedAt = null (excluding the BM herself).
//   2. Recently added residents (last 30 days) — useful for spotting
//      onboarding mistakes.
//   3. Active staff (FM/concierge) with last-login info.
//
// Mutations (verify, archive) live on /team/staff and /team/residents
// already; this page is the inbox / overview that lets a BM scan and
// jump to the right detail page.

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function AccessRequestsPage() {
  const { appUser } = await requireTeam();
  if (appUser.role !== "building_manager") redirect("/team");
  if (!appUser.buildingId) redirect("/team");

  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [pendingVerifications, recentResidents, activeStaff] = await Promise.all([
    prisma.user.findMany({
      where: {
        buildingId: appUser.buildingId,
        verifiedAt: null,
        archivedAt: null,
        // Exclude the BM themselves; admin handles BM verifications.
        role: { in: ["facility_manager", "concierge", "resident", "tenant"] },
      },
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
        unitRel: { select: { unitNumber: true } },
      },
      orderBy: { createdAt: "asc" },
    }).catch(() => []),

    prisma.user.findMany({
      where: {
        buildingId: appUser.buildingId,
        role: { in: ["resident", "tenant"] },
        archivedAt: null,
        createdAt: { gte: since },
      },
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
        verifiedAt: true,
        unitRel: { select: { unitNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }).catch(() => []),

    prisma.user.findMany({
      where: {
        buildingId: appUser.buildingId,
        role: { in: ["facility_manager", "concierge"] },
        archivedAt: null,
      },
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
        lastLoginAt: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }).catch(() => []),
  ]);

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
      <div className="space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Building Manager
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Access requests</h1>
        <p className="text-sm text-muted-foreground">
          Inbox of pending verifications and recent additions to your building. Detail edits live
          on the <Link href="/team/staff" className="text-accent hover:underline">staff</Link> and
          {" "}<Link href="/team/residents" className="text-accent hover:underline">residents</Link> pages.
        </p>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-300">
            Pending verification · {pendingVerifications.length}
          </h2>
        </div>
        {pendingVerifications.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-6 text-sm text-muted-foreground">
            No pending verifications. Every account in your building has been reviewed.
          </div>
        ) : (
          <ul className="bg-card border border-amber-500/30 rounded-md divide-y divide-border">
            {pendingVerifications.map((u) => (
              <li key={u.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.name} email={u.email} size="lg" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.name || u.email}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.email}
                      {u.unitRel?.unitNumber ? ` · Unit ${u.unitRel.unitNumber}` : ""}
                      <span> · signed up {formatRelative(u.createdAt)}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400">
                      {roleLabel(u.role)}
                    </div>
                  </div>
                </div>
                <Link
                  href={u.role === "facility_manager" || u.role === "concierge"
                    ? "/team/staff"
                    : "/team/residents"}
                  className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                >
                  Review →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Recent residents · last 30 days · {recentResidents.length}
        </h2>
        {recentResidents.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-6 text-sm text-muted-foreground">
            No new residents added in the last 30 days.
          </div>
        ) : (
          <ul className="bg-card border border-border rounded-md divide-y divide-border">
            {recentResidents.map((u) => (
              <li key={u.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.name} email={u.email} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.name || u.email}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.email}
                      {u.unitRel?.unitNumber ? ` · Unit ${u.unitRel.unitNumber}` : ""}
                      <span> · added {formatRelative(u.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {roleLabel(u.role)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Active staff · {activeStaff.length}
        </h2>
        {activeStaff.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-6 text-sm text-muted-foreground">
            No facility managers or concierges yet. Hire from{" "}
            <Link href="/team/staff" className="text-accent hover:underline">/team/staff</Link>.
          </div>
        ) : (
          <ul className="bg-card border border-border rounded-md divide-y divide-border">
            {activeStaff.map((u) => (
              <li key={u.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.name} email={u.email} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.name || u.email}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.email}
                      <span> · added {formatRelative(u.createdAt)}</span>
                      {u.lastLoginAt
                        ? <span> · last seen {formatRelative(u.lastLoginAt)}</span>
                        : <span> · never signed in</span>}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {roleLabel(u.role)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
