import Link from "next/link";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { Reveal } from "@/components/Reveal";

// Staff view of amenity operations — the FM's home turf, readable by all
// staff (concierge answers "is the party room booked tonight?"). Read-
// only in R1: shows each active amenity with today's + upcoming bookings.
// Residents book via /dashboard/amenities; management (blocking slots,
// cancelling) is R2.

const DAY_MS = 24 * 60 * 60 * 1000;

// Server component — evaluated per request.
function requestDates() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    dayStart,
    dayEnd: new Date(dayStart.getTime() + DAY_MS),
    weekEnd: new Date(dayStart.getTime() + 7 * DAY_MS),
  };
}

const fmtTime = (d: Date) =>
  d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });

export default async function TeamAmenitiesPage() {
  const { appUser } = await requireTeam();
  const { dayStart, dayEnd, weekEnd } = requestDates();

  const amenities = appUser.buildingId
    ? await prisma.amenity
        .findMany({
          where: { buildingId: appUser.buildingId, isActive: true },
          orderBy: { name: "asc" },
          include: {
            bookings: {
              where: {
                startTime: { gte: dayStart, lt: weekEnd },
                status: { in: ["pending", "confirmed"] },
              },
              orderBy: { startTime: "asc" },
              include: { user: { select: { name: true, email: true, unitRel: { select: { unitNumber: true } } } } },
            },
          },
        })
        .catch(() => [])
    : [];

  const totalToday = amenities.reduce(
    (n, a) => n + a.bookings.filter((b) => b.startTime < dayEnd).length,
    0,
  );

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
      <div className="space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Amenity operations
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Amenities</h1>
        <p className="text-sm text-muted-foreground">
          {amenities.length} active amenit{amenities.length === 1 ? "y" : "ies"} ·{" "}
          {totalToday} booking{totalToday === 1 ? "" : "s"} today. Residents book from their own
          portal; slot blocking and cancellations land in R2.
        </p>
      </div>

      {amenities.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="tools"
            title="No amenities configured"
            description="Amenities added to this building will appear here with their booking schedules."
          />
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {amenities.map((a, i) => {
            const today = a.bookings.filter((b) => b.startTime < dayEnd);
            const upcoming = a.bookings.filter((b) => b.startTime >= dayEnd).slice(0, 5);
            return (
              <Reveal key={a.id} delay={Math.min(i * 0.05, 0.2)}>
                <section className="bg-card border border-border rounded-md">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className="font-semibold">{a.name}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.category} · {a.openTime}–{a.closeTime}
                        {a.capacity ? ` · capacity ${a.capacity}` : ""}
                        {a.bookingRequired ? "" : " · no booking required"}
                      </p>
                    </div>
                    <StatusPill
                      label={today.length === 0 ? "Free today" : `${today.length} today`}
                      tone={today.length === 0 ? "green" : "blue"}
                    />
                  </div>
                  {(today.length > 0 || upcoming.length > 0) && (
                    <ul className="divide-y divide-border">
                      {today.map((b) => (
                        <li key={b.id} className="px-5 py-3 flex items-center gap-3">
                          <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0 w-28">
                            {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {b.user.name || b.user.email}
                            {b.user.unitRel?.unitNumber ? (
                              <span className="text-muted-foreground"> · Unit {b.user.unitRel.unitNumber}</span>
                            ) : null}
                          </span>
                          {b.status === "pending" && <StatusPill label="pending" tone="amber" />}
                        </li>
                      ))}
                      {upcoming.map((b) => (
                        <li key={b.id} className="px-5 py-3 flex items-center gap-3 opacity-75">
                          <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0 w-28">
                            {fmtDay(b.startTime)} {fmtTime(b.startTime)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {b.user.name || b.user.email}
                            {b.user.unitRel?.unitNumber ? (
                              <span className="text-muted-foreground"> · Unit {b.user.unitRel.unitNumber}</span>
                            ) : null}
                          </span>
                          {b.status === "pending" && <StatusPill label="pending" tone="amber" />}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </Reveal>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Residents book from{" "}
        <Link href="/dashboard/amenities" className="text-accent hover:underline">
          their amenities page
        </Link>
        ; bookings appear here in real time.
      </p>
    </main>
  );
}
