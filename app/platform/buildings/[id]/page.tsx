import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { UserRole } from "@prisma/client";

const STAFF_ROLES: UserRole[] = ["building_manager", "facility_manager", "concierge"];
const RESIDENT_ROLES: UserRole[] = ["resident", "tenant"];

export default async function BuildingDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;

  // Fetch the building, then load related collections in parallel — the
  // schema doesn't support _count + nested includes the way the original
  // single-query approach assumed.
  const building = await prisma.building.findUnique({ where: { id } });
  if (!building) notFound();

  const [users, units, workOrderCount, announcementCount] = await Promise.all([
    prisma.user.findMany({
      where: { buildingId: id, archivedAt: null },
      orderBy: [{ role: "asc" }, { email: "asc" }],
      include: { unitRel: { select: { unitNumber: true } } },
    }),
    prisma.unit.findMany({
      where: { buildingId: id },
      orderBy: [{ floor: "asc" }, { unitNumber: "asc" }],
      include: { _count: { select: { users: true } } },
    }),
    prisma.workOrder.count({ where: { buildingId: id } }),
    prisma.announcement.count({ where: { buildingId: id, deletedAt: null } }),
  ]);

  const staff = users.filter((u) => STAFF_ROLES.includes(u.role));
  const residents = users.filter((u) => RESIDENT_ROLES.includes(u.role));

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-6xl mx-auto">
      <Breadcrumbs
        items={[
          { label: "Platform", href: "/platform" },
          { label: "Buildings", href: "/platform" },
          { label: building.name },
        ]}
      />

      <div className="mt-4 space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Building</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{building.name}</h1>
        <p className="text-sm text-muted-foreground">
          {building.address}, {building.city}, {building.state} {building.zipCode} · {building.timezone}
        </p>
      </div>

      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Units" value={units.length} />
        <Stat label="Users" value={users.length} />
        <Stat label="Work orders" value={workOrderCount} />
        <Stat label="Announcements" value={announcementCount} />
      </div>

      <Section title="Team" empty="No staff assigned to this building yet.">
        {staff.length > 0 && (
          <ul className="divide-y divide-border">
            {staff.map((u) => (
              <UserRow key={u.id} user={u} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Residents" empty="No residents linked yet.">
        {residents.length > 0 && (
          <ul className="divide-y divide-border">
            {residents.map((u) => (
              <UserRow key={u.id} user={u} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Units" empty="No units yet — Building Manager can add them at /team/units.">
        {units.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-3 px-5 font-semibold">Unit</th>
                <th className="text-left py-3 px-5 font-semibold">Floor</th>
                <th className="text-right py-3 px-5 font-semibold">Rent</th>
                <th className="text-right py-3 px-5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 px-5 font-medium">Unit {u.unitNumber}</td>
                  <td className="py-3 px-5 text-muted-foreground">{u.floor ?? "—"}</td>
                  <td className="py-3 px-5 text-right tabular-nums">
                    {u.rentAmount ? `$${Number(u.rentAmount).toLocaleString()}` : "—"}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${u._count.users > 0 ? "bg-accent/10 text-accent border-accent/30" : "bg-muted/30 text-muted-foreground border-border"}`}>
                      {u._count.users > 0 ? "occupied" : "available"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="block p-5 bg-card border border-border rounded-md">
      <div className="text-3xl md:text-4xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="mt-3 bg-card border border-border rounded-md overflow-hidden">
        {children || <p className="px-5 py-4 text-sm text-muted-foreground">{empty}</p>}
      </div>
    </section>
  );
}

function UserRow({
  user,
}: {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    unit: string | null;
    unitRel: { unitNumber: string } | null;
  };
}) {
  const unitLabel = user.unitRel?.unitNumber || user.unit;
  return (
    <li className="px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={user.name} email={user.email} />
        <div className="min-w-0">
          <div className="font-medium truncate">{user.name || user.email}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </div>
      </div>
      <div className="text-sm flex items-center gap-3 shrink-0">
        {unitLabel && <span className="text-muted-foreground">Unit {unitLabel}</span>}
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border border-border bg-muted/30">
          {user.role.replace("_", " ")}
        </span>
      </div>
    </li>
  );
}
