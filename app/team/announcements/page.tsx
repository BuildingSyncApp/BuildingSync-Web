import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill, type Tone } from "@/components/StatusPill";
import { formatRelative } from "@/lib/format";
import { AnnouncementForm } from "./AnnouncementForm";

const AUDIENCE_LABEL: Record<string, string> = {
  all: "All residents & tenants",
  tenants_only: "Tenants only",
  specific_units: "Specific units",
};
const AUDIENCE_TONE: Record<string, Tone> = {
  all: "neutral",
  tenants_only: "blue",
  specific_units: "violet",
};

export default async function TeamAnnouncementsPage() {
  const { appUser } = await requireTeam();
  if (appUser.role !== "building_manager") redirect("/team");

  const [announcements, units] = await Promise.all([
    appUser.buildingId
      ? prisma.announcement.findMany({
          where: { buildingId: appUser.buildingId, deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    appUser.buildingId
      ? prisma.unit.findMany({
          where: { buildingId: appUser.buildingId },
          orderBy: { unitNumber: "asc" },
          select: { id: true, unitNumber: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight">Announcements</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {announcements.length} posted
      </p>

      <section className="mt-8 bg-card border border-border rounded-md p-5">
        <h2 className="text-base font-semibold">Post a new announcement</h2>
        <AnnouncementForm hasBuilding={Boolean(appUser.buildingId)} units={units} />
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Posted</h2>
        {announcements.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon="megaphone"
              title="No announcements yet"
              description="Post one above. We'll email every recipient in the audience you pick."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {announcements.map((a) => (
              <li key={a.id} className="bg-card border border-border rounded-md p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <h3 className="font-medium">{a.title}</h3>
                  <StatusPill
                    label={AUDIENCE_LABEL[a.audience] ?? a.audience}
                    tone={AUDIENCE_TONE[a.audience] ?? "neutral"}
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                <p className="mt-3 text-xs text-muted-foreground/85">
                  {formatRelative(a.createdAt)}
                  {a.audience === "specific_units" && a.targetUnitIds.length > 0 && (
                    <span> · {a.targetUnitIds.length} unit{a.targetUnitIds.length === 1 ? "" : "s"} targeted</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
