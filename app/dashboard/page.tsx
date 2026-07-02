import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelative } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { getNotifications } from "@/lib/notifications";
import { WelcomeCard } from "./WelcomeCard";

// Resident/tenant home — rethought as a real dashboard, not a feed.
// Four zones instead of nine stacked sections:
//
//   1. HERO — compressed identity strip
//   2. TODAY — urgent items + quick actions side-by-side (or stacked on mobile)
//   3. RECENT ACTIVITY — unified chronological feed (announcements + packages + events)
//   4. SHORTCUTS — one-tap grid to every section
//   + HELP FOOTER — building manager contact, never a dead end
//
// Optimised for the resident who comes in to "check if anything happened" —
// the activity feed answers that immediately. Optimised for older users
// who want big targets — every action is at least 44px.

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Hi";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Icon({ d, children, className = "w-5 h-5" }: { d?: string; children?: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {d && <path d={d} />}
      {children}
    </svg>
  );
}

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

// ─── Icons used throughout — declared once for reuse ─────────────
const IconMaintenance = <Icon d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />;
const IconAnnouncement = <Icon d="M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14 M15.54 8.46a5 5 0 0 1 0 7.07" />;
const IconPackage = <Icon><rect x="2" y="6" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></Icon>;
const IconAmenity = <Icon d="M2 12h20 M12 12V2 M5 12a7 7 0 0 1 14 0" />;
const IconEvent = <Icon d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M16 2v4 M8 2v4 M3 10h18" />;
const IconDocument = <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />;
const IconContact = <Icon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />;
const IconRent = <Icon d="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />;

type ActivityItem = {
  id: string;
  kind: "announcement" | "package" | "event";
  title: string;
  meta: string;
  href: string;
  when: Date;
};

export default async function DashboardPage() {
  const { authUser, appUser } = await requireUser();
  // Owners get the investment view; sub-pages (settings, documents)
  // stay shared with residents.
  if (appUser.role === "building_owner") redirect("/owner");
  const now = new Date();
  const isTenant = appUser.role === "tenant";

  const [
    building,
    unit,
    recentAnnouncements,
    upcomingEvents,
    pendingDeliveries,
    notifications,
    openWorkOrders,
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
          take: 5,
          select: { id: true, title: true, createdAt: true, author: { select: { name: true } } },
        }).catch(() => [])
      : Promise.resolve([]),
    appUser.buildingId
      ? prisma.event
          .findMany({
            where: { buildingId: appUser.buildingId, startTime: { gte: now } },
            orderBy: { startTime: "asc" },
            take: 3,
            select: { id: true, title: true, startTime: true, location: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.delivery
      .findMany({
        where: { recipientUserId: appUser.id, status: "pending" },
        orderBy: { receivedAt: "desc" },
        take: 5,
        select: { id: true, sender: true, description: true, pickupCode: true, receivedAt: true },
      })
      .catch(() => []),
    getNotifications({ id: appUser.id, role: appUser.role, buildingId: appUser.buildingId }).catch(() => []),
    prisma.workOrder
      .findMany({
        where: { openedById: appUser.id, status: { in: ["open", "in_progress", "scheduled"] } },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { id: true, issue: true, status: true, updatedAt: true },
      })
      .catch(() => []),
    appUser.buildingId
      ? prisma.user
          .findFirst({
            where: { buildingId: appUser.buildingId, role: "building_manager", isActive: true },
            select: { name: true, email: true, phone: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
    isTenant
      ? prisma.lease
          .findFirst({
            where: { tenantId: appUser.id, archivedAt: null, status: "active" },
            orderBy: { leaseStartDate: "desc" },
            select: { id: true, rentAmountMonthly: true, leaseStartDate: true, leaseEndDate: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const displayName = appUser.name || authUser.email!.split("@")[0];
  const firstName = displayName.split(/[\s.]/)[0];
  const greeting = greetingFor(now);

  // Unified activity feed — merge announcements, packages, events,
  // sort by recency, take top 6.
  const activity: ActivityItem[] = [
    ...recentAnnouncements.map((a): ActivityItem => ({
      id: `a-${a.id}`,
      kind: "announcement",
      title: a.title,
      meta: `${a.author?.name || "Building team"} · ${formatRelative(a.createdAt)}`,
      href: "/dashboard/announcements",
      when: a.createdAt,
    })),
    ...pendingDeliveries.map((d): ActivityItem => ({
      id: `p-${d.id}`,
      kind: "package",
      title: `Package from ${d.sender}`,
      meta: `Pickup code ${d.pickupCode} · ${formatRelative(d.receivedAt)}`,
      href: "/dashboard/deliveries",
      when: d.receivedAt,
    })),
    ...upcomingEvents.map((e): ActivityItem => ({
      id: `e-${e.id}`,
      kind: "event",
      title: e.title,
      meta: `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(e.startTime)}${e.location ? ` · ${e.location}` : ""}`,
      href: "/dashboard/events",
      when: e.startTime,
    })),
  ].sort((x, y) => y.when.getTime() - x.when.getTime()).slice(0, 6);

  const nextRent = activeLease ? nextRentDue(activeLease, now) : null;
  const rentDaysOut = nextRent ? daysBetween(nextRent, now) : null;
  const rentUrgent = nextRent !== null && rentDaysOut !== null && rentDaysOut <= 7;

  const hasUrgent = openWorkOrders.length > 0 || pendingDeliveries.length > 0 || rentUrgent;

  return (
    <main className="pb-12">
      {/* ─── 1. HERO ───────────────────────────────────────────── */}
      <section className="bg-foreground text-background px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6 md:rounded-b-2xl">
        <div className="max-w-5xl mx-auto">
          {/* Mobile-only action row. */}
          <div className="md:hidden flex items-center justify-end gap-1 -mt-1 mb-2 -mr-2">
            <NotificationBell items={notifications} />
            <Link
              href="/dashboard/menu"
              aria-label="Open menu"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-background/10 transition-colors"
            >
              <Avatar name={appUser.name} email={authUser.email!} size="md" className="ring-2 ring-background/30" />
            </Link>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-background/70">
                {greeting}, {firstName}
              </p>
              <h1 className="mt-0.5 text-xl md:text-2xl font-semibold tracking-tight leading-tight">
                {building ? building.name : "Welcome to your building"}
              </h1>
              {building && unit && (
                <p className="mt-1 text-sm text-background/60">Unit {unit.unitNumber}</p>
              )}
            </div>
            <Avatar name={appUser.name} email={authUser.email!} size="lg" className="hidden md:block ring-2 ring-background/20 shrink-0" />
          </div>
        </div>
      </section>

      {!building ? (
        <div className="max-w-md mt-6 mx-4 md:mx-auto bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-base text-foreground leading-relaxed">
            Your account isn&apos;t linked to a building yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Ask your building manager to add you, or contact us if you need a hand.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/dashboard/account" className="inline-flex justify-center items-center px-4 py-2.5 rounded-md border border-border hover:bg-muted transition-colors text-sm">
              Complete your profile
            </Link>
            <a href="mailto:info@buildingsync.app" className="inline-flex justify-center items-center px-4 py-2.5 rounded-md border border-border hover:bg-muted transition-colors text-sm">
              Contact support
            </a>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 space-y-6">
          <WelcomeCard firstName={firstName} />

          {/* ─── 2. TODAY + QUICK ACTIONS ──────────────────────── */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Today (urgent items) — wider on desktop, full-width on mobile */}
            <section
              aria-labelledby="today-heading"
              className="md:col-span-2 bg-card border border-border rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 id="today-heading" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Today
                </h2>
                {hasUrgent && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {openWorkOrders.length + pendingDeliveries.length + (rentUrgent ? 1 : 0)} item{(openWorkOrders.length + pendingDeliveries.length + (rentUrgent ? 1 : 0)) === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {!hasUrgent ? (
                <div className="py-6 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Icon d="M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01l-3-3" />
                  </div>
                  <p className="mt-3 text-base font-medium">All caught up</p>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    No open repairs, no packages waiting{isTenant ? ", and no rent due in the next week" : ""}.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {openWorkOrders.map((wo) => (
                    <li key={`wo-${wo.id}`}>
                      <Link href="/dashboard/maintenance" className="flex items-center gap-3 -mx-2 px-3 py-2.5 rounded-lg hover:bg-amber-500/5 transition-colors">
                        <span className="shrink-0 w-9 h-9 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                          {IconMaintenance}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-base truncate">{wo.issue}</div>
                          <div className="text-xs text-muted-foreground">
                            {wo.status.replace("_", " ")} · updated {formatRelative(wo.updatedAt)}
                          </div>
                        </div>
                        <Icon d="M9 18l6-6-6-6" className="w-4 h-4 text-muted-foreground shrink-0" />
                      </Link>
                    </li>
                  ))}
                  {pendingDeliveries.slice(0, 3).map((d) => (
                    <li key={`pkg-${d.id}`}>
                      <Link href="/dashboard/deliveries" className="flex items-center gap-3 -mx-2 px-3 py-2.5 rounded-lg hover:bg-sky-500/5 transition-colors">
                        <span className="shrink-0 w-9 h-9 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-400 flex items-center justify-center">
                          {IconPackage}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-base truncate">Package from {d.sender}</div>
                          <div className="text-xs text-muted-foreground">
                            Show pickup code at the front desk
                          </div>
                        </div>
                        <span className="shrink-0 text-[11px] font-mono uppercase tracking-widest px-2 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                          {d.pickupCode}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {rentUrgent && (
                    <li>
                      <Link href="/dashboard/payments" className="flex items-center gap-3 -mx-2 px-3 py-2.5 rounded-lg hover:bg-rose-500/5 transition-colors">
                        <span className="shrink-0 w-9 h-9 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-400 flex items-center justify-center">
                          {IconRent}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-base">
                            Rent due {rentDaysOut === 0 ? "today" : rentDaysOut === 1 ? "tomorrow" : `in ${rentDaysOut} days`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${activeLease!.rentAmountMonthly.toLocaleString()} · tap to pay
                          </div>
                        </div>
                        <Icon d="M9 18l6-6-6-6" className="w-4 h-4 text-muted-foreground shrink-0" />
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </section>

            {/* Quick actions — narrower column on desktop, stacks on mobile */}
            <section aria-labelledby="quick-heading" className="bg-card border border-border rounded-2xl p-5">
              <h2 id="quick-heading" className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
                Quick actions
              </h2>
              <div className="space-y-2">
                <Link
                  href="/dashboard/maintenance#new"
                  className="flex items-center gap-3 px-3 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <span className="shrink-0">{IconMaintenance}</span>
                  <span className="font-semibold">Report a problem</span>
                </Link>
                <Link
                  href="/dashboard/amenities"
                  className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <span className="shrink-0 text-amber-600">{IconAmenity}</span>
                  <span className="font-semibold">Book a space</span>
                </Link>
                <Link
                  href={isTenant ? "/dashboard/payments" : "/dashboard/contacts"}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <span className="shrink-0 text-sky-600">{isTenant ? IconRent : IconContact}</span>
                  <span className="font-semibold">{isTenant ? "Pay rent" : "Contact building"}</span>
                </Link>
              </div>
            </section>
          </div>

          {/* ─── 3. RECENT ACTIVITY (unified feed) ─────────────── */}
          <section aria-labelledby="activity-heading" className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 id="activity-heading" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Recent activity
              </h2>
              <Link href="/dashboard/announcements" className="text-sm text-accent hover:underline">
                View all →
              </Link>
            </div>
            {activity.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-base text-foreground">It&apos;s quiet right now.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  New announcements, packages, and events from your building will show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {activity.map((item) => {
                  const tone =
                    item.kind === "announcement" ? "text-rose-600 dark:text-rose-400 bg-rose-500/10" :
                    item.kind === "package" ? "text-sky-600 dark:text-sky-400 bg-sky-500/10" :
                    "text-violet-600 dark:text-violet-400 bg-violet-500/10";
                  const icon =
                    item.kind === "announcement" ? IconAnnouncement :
                    item.kind === "package" ? IconPackage :
                    IconEvent;
                  return (
                    <li key={item.id}>
                      <Link href={item.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                        <span className={`shrink-0 w-9 h-9 rounded-md flex items-center justify-center ${tone}`}>
                          {icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-base truncate">{item.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.meta}</div>
                        </div>
                        <Icon d="M9 18l6-6-6-6" className="w-4 h-4 text-muted-foreground shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ─── 4. SHORTCUTS ─────────────────────────────────── */}
          <section aria-labelledby="shortcuts-heading">
            <h2 id="shortcuts-heading" className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3 px-1">
              Shortcuts
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <ShortcutCard href="/dashboard/announcements" label="Notices" icon={IconAnnouncement} tone="text-rose-600 bg-rose-500/10" />
              <ShortcutCard href="/dashboard/deliveries" label="Packages" icon={IconPackage} tone="text-sky-600 bg-sky-500/10" />
              <ShortcutCard href="/dashboard/amenities" label="Spaces" icon={IconAmenity} tone="text-amber-600 bg-amber-500/10" />
              <ShortcutCard href="/dashboard/events" label="Events" icon={IconEvent} tone="text-violet-600 bg-violet-500/10" />
              <ShortcutCard href="/dashboard/documents" label="Documents" icon={IconDocument} tone="text-yellow-600 bg-yellow-500/10" />
              <ShortcutCard href="/dashboard/contacts" label="Contacts" icon={IconContact} tone="text-emerald-600 bg-emerald-500/10" />
            </div>
          </section>

          {/* ─── HELP FOOTER ──────────────────────────────────── */}
          <section className="bg-muted/30 border border-border rounded-2xl p-5">
            <h2 className="text-base font-semibold">Need help?</h2>
            {buildingManager ? (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Your building manager is{" "}
                <span className="font-medium text-foreground">{buildingManager.name || buildingManager.email}</span>.
                Email{" "}
                <a href={`mailto:${buildingManager.email}`} className="text-accent hover:underline">{buildingManager.email}</a>
                {buildingManager.phone && (
                  <>
                    {" "}or call{" "}
                    <a href={`tel:${buildingManager.phone}`} className="text-accent hover:underline">{buildingManager.phone}</a>
                  </>
                )}
                {" "}for anything urgent that isn&apos;t a maintenance request.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Your building team will appear here once they&apos;ve set up their accounts. For app issues, email{" "}
                <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">info@buildingsync.app</a>.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <Link href="/docs" className="hover:text-foreground underline-offset-2 hover:underline">Help Centre</Link>
              <Link href="/legal" className="hover:text-foreground underline-offset-2 hover:underline">Legal &amp; compliance</Link>
              <Link href="/privacy" className="hover:text-foreground underline-offset-2 hover:underline">Privacy</Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function ShortcutCard({ href, label, icon, tone }: { href: string; label: string; icon: React.ReactNode; tone: string }) {
  return (
    <Link
      href={href}
      className="bg-card border border-border rounded-xl p-3 flex flex-col items-center text-center gap-2 hover:border-accent transition-colors min-h-22 justify-center"
    >
      <span className={`w-9 h-9 rounded-md flex items-center justify-center ${tone}`}>
        {icon}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
