import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminHome() {
  const { appUser } = await requireAdmin();

  const [building, openCount, residentCount, announcementCount] = appUser.buildingId
    ? await Promise.all([
        prisma.building.findUnique({ where: { id: appUser.buildingId } }),
        prisma.workOrder.count({ where: { buildingId: appUser.buildingId, status: { in: ["open", "assigned", "in_progress"] } } }),
        prisma.user.count({ where: { buildingId: appUser.buildingId, role: { in: ["resident", "tenant"] } } }),
        prisma.announcement.count({ where: { buildingId: appUser.buildingId } }),
      ])
    : [null, 0, 0, 0];

  const isBM = appUser.role === "building_manager";

  return (
    <main className="px-6 py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-semibold">Welcome, {appUser.role.replace("_", " ")}</h1>
      <p className="mt-2 opacity-70">
        {building ? `Managing ${building.name}` : "Your account is not yet linked to a building."}
      </p>

      <div className="mt-8 grid sm:grid-cols-3 gap-3">
        <StatCard href="/admin/work-orders" value={openCount} label="Open work orders" />
        <StatCard href="/admin/residents" value={residentCount} label="Residents" />
        <StatCard href={isBM ? "/admin/announcements" : null} value={announcementCount} label="Announcements" />
      </div>
    </main>
  );
}

function StatCard({ href, value, label }: { href: string | null; value: number; label: string }) {
  const inner = (
    <>
      <div className="text-3xl font-semibold">{value}</div>
      <div className="text-sm opacity-60 mt-1">{label}</div>
    </>
  );
  const className = "block p-4 rounded-md border transition-opacity";
  if (href) {
    return (
      <Link href={href} className={`${className} hover:opacity-80`} style={{ borderColor: "currentColor" }}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={className} style={{ borderColor: "currentColor", opacity: 0.6 }}>
      {inner}
    </div>
  );
}
