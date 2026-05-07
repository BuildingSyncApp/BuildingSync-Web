import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/EmptyState";
import { formatRelative } from "@/lib/format";

export default async function AnnouncementsPage() {
  const { appUser } = await requireUser();

  // Audience filter: residents see "all" + (their unit) for specific_units;
  // tenants additionally see "tenants_only". Excludes soft-deleted.
  const announcements = appUser.buildingId
    ? await prisma.announcement.findMany({
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
        take: 50,
      })
    : [];

  return (
    <main className="min-h-dvh px-4 md:px-6 py-8 md:py-10 max-w-3xl mx-auto">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Announcements</h1>

      {!appUser.buildingId ? (
        <div className="mt-8">
          <EmptyState
            icon="megaphone"
            title="No building assigned yet"
            description="Once your Building Manager links you to a building, their announcements will show up here."
          />
        </div>
      ) : announcements.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="megaphone"
            title="No announcements yet"
            description="Notices from your building team will appear here, and we'll email them too."
          />
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {announcements.map((a) => (
            <li key={a.id} className="bg-card border border-border rounded-md p-5">
              <h2 className="font-semibold">{a.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
              <p className="mt-4 text-xs text-muted-foreground/85">
                {formatRelative(a.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
