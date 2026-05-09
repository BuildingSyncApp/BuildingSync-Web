import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateShort } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

// Resident/tenant home — v2 design: dark hero with building + user
// identity, then a vertical feed of sections (Announcements, Amenity
// Reservations, Events, Deliveries, Instructions). Each section pulls
// real data from the v2 schema and falls back to an empty state.

function SectionHeader({
  icon,
  iconBg,
  iconColor,
  title,
  href,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2.5">
        <span className={`w-7 h-7 rounded-md flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </span>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      <Link href={href} className="text-sm text-accent hover:underline flex items-center gap-0.5">
        View all
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  );
}

function SectionIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function formatTimeRange(start: Date, end: Date | null): string {
  const fmtDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
  const fmtTime = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
  const datePart = fmtDate.format(start);
  if (!end) return `${datePart} · ${fmtTime.format(start)}`;
  return `${datePart} · ${fmtTime.format(start)} – ${fmtTime.format(end)}`;
}

export default async function DashboardPage() {
  const { authUser, appUser } = await requireUser();
  const now = new Date();

  const [building, unit, recentAnnouncements, upcomingBooking, upcomingEvents, pendingDeliveries] = await Promise.all([
    appUser.buildingId
      ? prisma.building.findUnique({ where: { id: appUser.buildingId } }).catch(() => null)
      : Promise.resolve(null),
    appUser.unitId
      ? prisma.unit.findUnique({ where: { id: appUser.unitId } }).catch(() => null)
      : Promise.resolve(null),
    appUser.buildingId
      ? prisma.announcement.findMany({
          where: {
            buildingId: appUser.buildingId,
            deletedAt: null,
            OR: [
              { audience: "all" },
              ...(appUser.role === "tenant" ? [{ audience: "tenants_only" as const }] : []),
              ...(appUser.unitId
                ? [{ audience: "specific_units" as const, targetUnitIds: { has: appUser.unitId } }]
                : []),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            title: true,
            createdAt: true,
            author: { select: { name: true, role: true } },
          },
        }).catch((err) => {
          console.error("[dashboard] announcement.findMany failed", err);
          return [];
        })
      : Promise.resolve([]),
    prisma.amenityBooking
      .findFirst({
        where: {
          userId: appUser.id,
          status: { in: ["confirmed", "pending"] },
          endTime: { gte: now },
        },
        orderBy: { startTime: "asc" },
        include: { amenity: { select: { name: true, category: true } } },
      })
      .catch((err) => {
        console.error("[dashboard] amenityBooking.findFirst failed", err);
        return null;
      }),
    appUser.buildingId
      ? prisma.event
          .findMany({
            where: { buildingId: appUser.buildingId, startTime: { gte: now } },
            orderBy: { startTime: "asc" },
            take: 2,
            select: { id: true, title: true, startTime: true, endTime: true, location: true },
          })
          .catch((err) => {
            console.error("[dashboard] event.findMany failed", err);
            return [];
          })
      : Promise.resolve([]),
    prisma.delivery
      .findMany({
        where: { recipientUserId: appUser.id, status: "pending" },
        orderBy: { receivedAt: "desc" },
        take: 3,
        select: {
          id: true,
          sender: true,
          description: true,
          pickupCode: true,
          receivedAt: true,
        },
      })
      .catch((err) => {
        console.error("[dashboard] delivery.findMany failed", err);
        return [];
      }),
  ]);

  const displayName = appUser.name || authUser.email!.split("@")[0];

  return (
    <main className="pb-8">
      <section className="bg-foreground text-background px-5 pt-6 pb-8 md:rounded-b-2xl">
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
              {building ? building.name : "Welcome to BuildingSync"}
            </h1>
            {building && (
              <p className="mt-2 text-sm text-background/70 truncate">
                {displayName}
                {unit ? ` · ${unit.unitNumber}` : ""}
              </p>
            )}
          </div>
          <Avatar
            name={appUser.name}
            email={authUser.email!}
            size="lg"
            className="ring-2 ring-background/20 mt-1 shrink-0"
          />
        </div>
      </section>

      {!building ? (
        <div className="max-w-md mx-auto mt-6 mx-4 bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your account isn&apos;t linked to a building yet. Ask your Building Manager to add you.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Need help? Email{" "}
            <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">info@buildingsync.app</a>.
          </p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 space-y-8">
          {/* Announcements — horizontal scroll cards */}
          <section>
            <SectionHeader
              icon={<SectionIcon d="M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14 M15.54 8.46a5 5 0 0 1 0 7.07" />}
              iconBg="bg-rose-500/15"
              iconColor="text-rose-600 dark:text-rose-400"
              title="Announcements"
              href="/dashboard/announcements"
            />
            {recentAnnouncements.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground">
                No announcements yet. Your building team will post notices here.
              </div>
            ) : (
              <div className="-mx-4 md:-mx-0 overflow-x-auto scrollbar-hide">
                <ul className="flex gap-3 px-4 md:px-0 md:grid md:grid-cols-2 md:gap-3">
                  {recentAnnouncements.map((a) => (
                    <li
                      key={a.id}
                      className="shrink-0 w-72 md:w-auto bg-card border border-border rounded-xl p-4 flex flex-col"
                    >
                      <div className="font-semibold leading-snug line-clamp-2">{a.title}</div>
                      <div className="mt-auto pt-4 text-xs text-muted-foreground">
                        {a.author?.name || "Building team"} · {formatDateShort(a.createdAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Amenity Reservations */}
          <section>
            <SectionHeader
              icon={<SectionIcon d="M2 12h20 M12 12V2 M5 12a7 7 0 0 1 14 0" />}
              iconBg="bg-amber-500/15"
              iconColor="text-amber-600 dark:text-amber-400"
              title="Amenity Reservations"
              href="/dashboard/amenities"
            />
            <div className="space-y-2">
              {upcomingBooking && (
                <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{upcomingBooking.amenity.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatTimeRange(upcomingBooking.startTime, upcomingBooking.endTime)}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                    {upcomingBooking.status}
                  </span>
                </div>
              )}
              <Link
                href="/dashboard/amenities"
                className="block bg-card border border-border rounded-xl p-4 hover:border-accent transition-colors"
              >
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                  <span className="font-semibold">
                    {upcomingBooking ? "Reserve another" : "Reserve a building amenity"}
                  </span>
                </div>
              </Link>
            </div>
          </section>

          {/* Events Calendar */}
          <section>
            <SectionHeader
              icon={<SectionIcon d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M16 2v4 M8 2v4 M3 10h18" />}
              iconBg="bg-violet-500/15"
              iconColor="text-violet-600 dark:text-violet-400"
              title="Events Calendar"
              href="/dashboard/events"
            />
            {upcomingEvents.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground">
                No upcoming events. Your building team will post community gatherings here.
              </div>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.map((e) => (
                  <li key={e.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatTimeRange(e.startTime, e.endTime)}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Deliveries */}
          <section>
            <SectionHeader
              icon={<SectionIcon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96 12 12.01l8.73-5.05 M12 22.08V12" />}
              iconBg="bg-sky-500/15"
              iconColor="text-sky-600 dark:text-sky-400"
              title="Deliveries"
              href="/dashboard/deliveries"
            />
            {pendingDeliveries.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground">
                No packages waiting. The concierge will log new deliveries here as they arrive.
              </div>
            ) : (
              <ul className="space-y-2">
                {pendingDeliveries.map((d) => (
                  <li key={d.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                        <rect x="2" y="6" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{d.sender}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.description ? `${d.description} · ` : ""}{formatDateShort(d.receivedAt)}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                      {d.pickupCode}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Instructions and updates */}
          <section>
            <SectionHeader
              icon={<SectionIcon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" />}
              iconBg="bg-yellow-500/15"
              iconColor="text-yellow-600 dark:text-yellow-400"
              title="Instructions and updates"
              href="/dashboard/documents"
            />
            <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground">
              Bylaws, fire plans, and building updates appear here. Tap{" "}
              <span className="text-foreground font-medium">View all</span> to browse documents.
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
