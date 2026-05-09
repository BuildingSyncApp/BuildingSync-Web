import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatTimeRange(start: Date, end: Date | null): string {
  const fmtDate = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const fmtTime = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
  if (!end) return `${fmtDate.format(start)} · ${fmtTime.format(start)}`;
  return `${fmtDate.format(start)} · ${fmtTime.format(start)} – ${fmtTime.format(end)}`;
}

export default async function EventsPage() {
  const { appUser } = await requireUser();
  const now = new Date();

  const events = appUser.buildingId
    ? await prisma.event
        .findMany({
          where: { buildingId: appUser.buildingId, startTime: { gte: now } },
          orderBy: { startTime: "asc" },
          take: 50,
          select: {
            id: true,
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            location: true,
          },
        })
        .catch(() => [])
    : [];

  return (
    <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Events Calendar</h1>

      {events.length === 0 ? (
        <div className="mt-6 bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
          No upcoming events. Your building team will post community gatherings, town halls, and
          building-wide events here.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {events.map((e) => (
            <li key={e.id} className="bg-card border border-border rounded-xl p-5">
              <div className="font-semibold">{e.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatTimeRange(e.startTime, e.endTime)}
                {e.location ? ` · ${e.location}` : ""}
              </div>
              {e.description && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{e.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
