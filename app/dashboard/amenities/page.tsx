import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Amenity reservations — lists building amenities with their rules and
// the user's upcoming bookings. Booking creation flow is a follow-up;
// for now this surfaces the catalogue + status.

function formatTimeRange(start: Date, end: Date | null): string {
  const fmtDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
  const fmtTime = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
  if (!end) return `${fmtDate.format(start)} · ${fmtTime.format(start)}`;
  return `${fmtDate.format(start)} · ${fmtTime.format(start)} – ${fmtTime.format(end)}`;
}

export default async function AmenitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ booked?: string }>;
}) {
  const { appUser } = await requireUser();
  const now = new Date();
  const params = (await searchParams) || {};
  const justBooked = params.booked === "1";

  const [amenities, myBookings] = appUser.buildingId
    ? await Promise.all([
        prisma.amenity
          .findMany({
            where: { buildingId: appUser.buildingId, isActive: true },
            orderBy: [{ category: "asc" }, { name: "asc" }],
            include: { rules: { orderBy: { order: "asc" } } },
          })
          .catch(() => []),
        prisma.amenityBooking
          .findMany({
            where: {
              userId: appUser.id,
              endTime: { gte: now },
              status: { in: ["pending", "confirmed"] },
            },
            orderBy: { startTime: "asc" },
            include: { amenity: { select: { name: true } } },
          })
          .catch(() => []),
      ])
    : [[], []];

  return (
    <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Amenity Reservations</h1>

      {justBooked && (
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300" role="status">
          Booking submitted. Check &quot;Your upcoming bookings&quot; below for status.
        </div>
      )}

      {myBookings.length > 0 && (
        <section className="mt-6">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">
            Your upcoming bookings
          </p>
          <ul className="mt-2 space-y-2">
            {myBookings.map((b) => (
              <li key={b.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{b.amenity.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatTimeRange(b.startTime, b.endTime)}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                  {b.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">
          Available amenities
        </p>
        {amenities.length === 0 ? (
          <div className="mt-2 bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground">
            No amenities available yet. Your building manager will list bookable spaces here.
          </div>
        ) : (
          <ul className="mt-2 space-y-3">
            {amenities.map((a) => (
              <li key={a.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
                      {a.category}
                      {a.capacity ? ` · capacity ${a.capacity}` : ""}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
                    {a.openTime}–{a.closeTime}
                  </span>
                </div>
                {a.description && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a.description}</p>
                )}
                {a.rules.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground list-disc list-inside">
                    {a.rules.map((r) => (
                      <li key={r.id}>{r.text}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    Approval:{" "}
                    <span className="text-foreground">{a.approvalPolicy.replace("_", " ")}</span>
                  </span>
                  <Link
                    href={`/dashboard/amenities/${a.id}/book`}
                    className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                  >
                    Reserve
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
