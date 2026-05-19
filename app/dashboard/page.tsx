import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateShort } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { getNotifications } from "@/lib/notifications";
import { WelcomeCard } from "./WelcomeCard";

// Resident/tenant home. Personal command-centre. Optimised for
// scanning by older + new users:
//
//   - Big plain-language section labels (no jargon: "Building spaces"
//     not "Amenity Reservations").
//   - Urgent items surface at the top (open maintenance, packages
//     waiting, rent due).
//   - Quick-action row with three big primary CTAs.
//   - Tenant-only rent card with next-due date.
//   - Footer with the building team's contact email so users never
//     hit a dead end.

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Hi";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

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
        <span className={`w-8 h-8 rounded-md flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </span>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
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

function SectionIcon({ d, children }: { d?: string; children?: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
      {d && <path d={d} />}
      {children}
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

// Compute next rent due date from lease start + rent day.
// Assumption: rent is due on the leaseStartDate's day-of-month each
// month. Real-world leases vary; this is the safe default.
function nextRentDue(lease: { leaseStartDate: Date; leaseEndDate: Date }, now: Date): Date | null {
  const dom = lease.leaseStartDate.getDate();
  const candidate = new Date(now.getFullYear(), now.getMonth(), dom);
  if (candidate < now) candidate.setMonth(candidate.getMonth() + 1);
  if (candidate > lease.leaseEndDate) return null;
  return candidate;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const { authUser, appUser } = await requireUser();
  const now = new Date();
  const isTenant = appUser.role === "tenant";

  const [
    building,
    unit,
    recentAnnouncements,
    upcomingBooking,
    upcomingEvents,
    pendingDeliveries,
    notifications,
    openWorkOrders,
    documents,
    buildingManager,
    activeLease,
  ] = await Promise.all([
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
              ...(isTenant ? [{ audience: "tenants_only" as const }] : []),
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
    getNotifications({ id: appUser.id, role: appUser.role, buildingId: appUser.buildingId }).catch((err) => {
      console.error("[dashboard] getNotifications failed", err);
      return [];
    }),
    // Open work orders this user opened — drives the "urgent items"
    // strip. Closed/completed don't count as urgent.
    prisma.workOrder
      .findMany({
        where: {
          openedById: appUser.id,
          status: { in: ["open", "in_progress", "scheduled"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { id: true, issue: true, status: true, updatedAt: true },
      })
      .catch((err) => {
        console.error("[dashboard] workOrder.findMany failed", err);
        return [];
      }),
    // Building documents visible to residents (public visibility).
    appUser.buildingId
      ? prisma.document
          .findMany({
            where: {
              buildingId: appUser.buildingId,
              visibility: "public",
              deletedAt: null,
            },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: { id: true, title: true, category: true, createdAt: true },
          })
          .catch((err) => {
            console.error("[dashboard] document.findMany failed", err);
            return [];
          })
      : Promise.resolve([]),
    // Building manager email — used in the help footer as the
    // primary contact for the resident.
    appUser.buildingId
      ? prisma.user
          .findFirst({
            where: {
              buildingId: appUser.buildingId,
              role: "building_manager",
              isActive: true,
            },
            select: { name: true, email: true, phone: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
    // Active lease for tenants — drives the rent-due card.
    isTenant
      ? prisma.lease
          .findFirst({
            where: {
              tenantId: appUser.id,
              archivedAt: null,
              status: "active",
            },
            orderBy: { leaseStartDate: "desc" },
            select: {
              id: true,
              rentAmountMonthly: true,
              leaseStartDate: true,
              leaseEndDate: true,
            },
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const displayName = appUser.name || authUser.email!.split("@")[0];
  const firstName = displayName.split(/[\s.]/)[0];
  const greeting = greetingFor(now);

  // Urgent items: derived. Counts what shows in the strip.
  const urgentCount =
    openWorkOrders.length +
    pendingDeliveries.length +
    (activeLease && nextRentDue(activeLease, now)
      ? (() => {
          const d = nextRentDue(activeLease, now)!;
          return daysBetween(d, now) <= 7 ? 1 : 0;
        })()
      : 0);

  const nextRent = activeLease ? nextRentDue(activeLease, now) : null;
  const rentDaysOut = nextRent ? daysBetween(nextRent, now) : null;

  return (
    <main className="pb-12">
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-foreground text-background px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 md:rounded-b-2xl">
        <div className="max-w-3xl mx-auto">
          {/* Mobile-only action row. */}
          <div className="md:hidden flex items-center justify-end gap-1 -mt-1 mb-3 -mr-2">
            <NotificationBell items={notifications} />
            <Link
              href="/dashboard/menu"
              aria-label="Open menu"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-background/10 transition-colors"
            >
              <Avatar
                name={appUser.name}
                email={authUser.email!}
                size="md"
                className="ring-2 ring-background/30"
              />
            </Link>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-background/70">
                {greeting}, {firstName}
              </p>
              <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
                {building ? building.name : "Welcome to your building"}
              </h1>
              {building && (
                <p className="mt-2 text-sm text-background/70 truncate">
                  {unit ? `Unit ${unit.unitNumber}` : authUser.email}
                </p>
              )}
            </div>
            <Avatar
              name={appUser.name}
              email={authUser.email!}
              size="lg"
              className="hidden md:block ring-2 ring-background/20 mt-1 shrink-0"
            />
          </div>
        </div>
      </section>

      {!building ? (
        <div className="max-w-md mt-6 mx-4 md:mx-auto bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-base text-foreground leading-relaxed">
            Your account isn&apos;t linked to a building yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Ask your building manager to add you, or contact us if you
            need a hand.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/dashboard/account"
              className="inline-flex justify-center items-center px-4 py-2.5 rounded-md border border-border hover:bg-muted transition-colors text-sm"
            >
              Complete your profile
            </Link>
            <a
              href="mailto:info@buildingsync.app"
              className="inline-flex justify-center items-center px-4 py-2.5 rounded-md border border-border hover:bg-muted transition-colors text-sm"
            >
              Contact support
            </a>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 space-y-8">
          {/* First-run welcome card (dismissible, client). */}
          <WelcomeCard firstName={firstName} />

          {/* ─── Urgent items strip ────────────────────────────── */}
          {urgentCount > 0 && (
            <section aria-labelledby="urgent-heading">
              <h2 id="urgent-heading" className="sr-only">For your attention</h2>
              <div className="space-y-2">
                {openWorkOrders.map((wo) => (
                  <Link
                    key={`wo-${wo.id}`}
                    href="/dashboard/maintenance"
                    className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 hover:bg-amber-500/10 transition-colors"
                  >
                    <span className="shrink-0 w-9 h-9 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                      <SectionIcon d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{wo.issue}</div>
                      <div className="text-xs text-muted-foreground">
                        Status: {wo.status.replace("_", " ")} · tap to view
                      </div>
                    </div>
                  </Link>
                ))}
                {pendingDeliveries.map((d) => (
                  <Link
                    key={`pkg-${d.id}`}
                    href="/dashboard/deliveries"
                    className="flex items-center gap-3 bg-sky-500/5 border border-sky-500/30 rounded-xl p-4 hover:bg-sky-500/10 transition-colors"
                  >
                    <span className="shrink-0 w-9 h-9 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-400 flex items-center justify-center">
                      <SectionIcon>
                        <rect x="2" y="6" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </SectionIcon>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm">Package waiting from {d.sender}</div>
                      <div className="text-xs text-muted-foreground">
                        Show pickup code {d.pickupCode} at the front desk
                      </div>
                    </div>
                  </Link>
                ))}
                {nextRent && rentDaysOut !== null && rentDaysOut <= 7 && (
                  <Link
                    href="/dashboard/payments"
                    className="flex items-center gap-3 bg-rose-500/5 border border-rose-500/30 rounded-xl p-4 hover:bg-rose-500/10 transition-colors"
                  >
                    <span className="shrink-0 w-9 h-9 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-400 flex items-center justify-center">
                      <SectionIcon d="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm">
                        Rent due {rentDaysOut === 0 ? "today" : rentDaysOut === 1 ? "tomorrow" : `in ${rentDaysOut} days`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${activeLease!.rentAmountMonthly.toLocaleString()} · tap to pay
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* ─── Quick actions row ─────────────────────────────── */}
          <section aria-labelledby="quick-actions-heading">
            <h2 id="quick-actions-heading" className="sr-only">Quick actions</h2>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <Link
                href="/dashboard/maintenance"
                className="bg-card border border-border rounded-xl p-4 hover:border-accent transition-colors flex flex-col items-center text-center"
              >
                <span className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-2.5">
                  <SectionIcon d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
                </span>
                <span className="text-sm font-semibold leading-tight">Report a problem</span>
              </Link>
              <Link
                href="/dashboard/amenities"
                className="bg-card border border-border rounded-xl p-4 hover:border-accent transition-colors flex flex-col items-center text-center"
              >
                <span className="w-11 h-11 rounded-full bg-amber-600 text-white flex items-center justify-center mb-2.5">
                  <SectionIcon d="M2 12h20 M12 12V2 M5 12a7 7 0 0 1 14 0" />
                </span>
                <span className="text-sm font-semibold leading-tight">Book a space</span>
              </Link>
              <Link
                href={isTenant ? "/dashboard/payments" : "/dashboard/contacts"}
                className="bg-card border border-border rounded-xl p-4 hover:border-accent transition-colors flex flex-col items-center text-center"
              >
                <span className="w-11 h-11 rounded-full bg-sky-600 text-white flex items-center justify-center mb-2.5">
                  {isTenant ? (
                    <SectionIcon d="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  ) : (
                    <SectionIcon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  )}
                </span>
                <span className="text-sm font-semibold leading-tight">
                  {isTenant ? "Pay rent" : "Contact building"}
                </span>
              </Link>
            </div>
          </section>

          {/* ─── Announcements ─────────────────────────────────── */}
          <section>
            <SectionHeader
              icon={<SectionIcon d="M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14 M15.54 8.46a5 5 0 0 1 0 7.07" />}
              iconBg="bg-rose-500/15"
              iconColor="text-rose-600 dark:text-rose-400"
              title="Announcements"
              href="/dashboard/announcements"
            />
            {recentAnnouncements.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-5 text-base text-foreground/85">
                <p>No announcements right now.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your building team will post notices here — fire drills, elevator maintenance, holiday hours, that sort of thing.
                </p>
              </div>
            ) : (
              <div className="-mx-4 md:mx-0 overflow-x-auto scrollbar-hide">
                <ul className="flex gap-3 px-4 md:px-0 md:grid md:grid-cols-2 md:gap-3">
                  {recentAnnouncements.map((a) => (
                    <li
                      key={a.id}
                      className="shrink-0 w-72 md:w-auto bg-card border border-border rounded-xl p-4 flex flex-col"
                    >
                      <div className="font-semibold leading-snug line-clamp-2 text-base">{a.title}</div>
                      <div className="mt-auto pt-4 text-xs text-muted-foreground">
                        {a.author?.name || "Building team"} · {formatDateShort(a.createdAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ─── Packages ──────────────────────────────────────── */}
          <section>
            <SectionHeader
              icon={<SectionIcon><rect x="2" y="6" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></SectionIcon>}
              iconBg="bg-sky-500/15"
              iconColor="text-sky-600 dark:text-sky-400"
              title="Packages"
              href="/dashboard/deliveries"
            />
            {pendingDeliveries.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-5 text-base text-foreground/85">
                <p>No packages waiting.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  When the concierge logs a package for you, you&apos;ll see a pickup code here.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {pendingDeliveries.map((d) => (
                  <li key={d.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <SectionIcon><rect x="2" y="6" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></SectionIcon>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-base">{d.sender}</div>
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

          {/* ─── Building spaces (amenity reservations) ────────── */}
          <section>
            <SectionHeader
              icon={<SectionIcon d="M2 12h20 M12 12V2 M5 12a7 7 0 0 1 14 0" />}
              iconBg="bg-amber-500/15"
              iconColor="text-amber-600 dark:text-amber-400"
              title="Building spaces"
              href="/dashboard/amenities"
            />
            <div className="space-y-2">
              {upcomingBooking && (
                <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-base">{upcomingBooking.amenity.name}</div>
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
                    <SectionIcon>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </SectionIcon>
                  </span>
                  <span className="font-semibold text-base">
                    {upcomingBooking ? "Book another space" : "Book a building space"}
                  </span>
                </div>
              </Link>
            </div>
          </section>

          {/* ─── Events ────────────────────────────────────────── */}
          <section>
            <SectionHeader
              icon={<SectionIcon d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M16 2v4 M8 2v4 M3 10h18" />}
              iconBg="bg-violet-500/15"
              iconColor="text-violet-600 dark:text-violet-400"
              title="Events"
              href="/dashboard/events"
            />
            {upcomingEvents.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-5 text-base text-foreground/85">
                <p>No upcoming events.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Community gatherings, holiday parties, and building meetings will show up here.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.map((e) => (
                  <li key={e.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="font-semibold text-base">{e.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatTimeRange(e.startTime, e.endTime)}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─── Building documents ────────────────────────────── */}
          <section>
            <SectionHeader
              icon={<SectionIcon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />}
              iconBg="bg-yellow-500/15"
              iconColor="text-yellow-600 dark:text-yellow-400"
              title="Building documents"
              href="/dashboard/documents"
            />
            {documents.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-5 text-base text-foreground/85">
                <p>No documents posted yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bylaws, fire-safety plans, and building rules will appear here when your building team uploads them.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {documents.map((d) => (
                  <li key={d.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-md bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 flex items-center justify-center shrink-0">
                      <SectionIcon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-base">{d.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.category.replace(/_/g, " ")} · {formatDateShort(d.createdAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─── Help footer ───────────────────────────────────── */}
          <section className="bg-muted/30 border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold">Need help?</h2>
            {buildingManager ? (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Your building manager is{" "}
                <span className="font-medium text-foreground">{buildingManager.name || buildingManager.email}</span>.
                Email{" "}
                <a href={`mailto:${buildingManager.email}`} className="text-accent hover:underline">
                  {buildingManager.email}
                </a>
                {buildingManager.phone && (
                  <>
                    {" "}or call{" "}
                    <a href={`tel:${buildingManager.phone}`} className="text-accent hover:underline">
                      {buildingManager.phone}
                    </a>
                  </>
                )}
                {" "}for anything urgent that isn&apos;t a maintenance request.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Your building team will appear here once they&apos;ve set up their accounts. For app issues, email{" "}
                <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">
                  info@buildingsync.app
                </a>
                .
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/dashboard/contacts"
                className="inline-flex items-center px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted/40 transition-colors text-xs"
              >
                All building contacts
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted/40 transition-colors text-xs"
              >
                Help centre
              </Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
