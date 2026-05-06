import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES = ["building_manager", "facility_manager", "concierge"] as const;

export default async function DashboardPage() {
  const { authUser, appUser } = await requireUser();

  // Resident dashboard is for residents/tenants only. Staff land on /admin.
  if ((STAFF_ROLES as readonly string[]).includes(appUser.role)) redirect("/admin");

  const building = appUser.buildingId
    ? await prisma.building.findUnique({ where: { id: appUser.buildingId } })
    : null;
  const unit = appUser.unitId
    ? await prisma.unit.findUnique({ where: { id: appUser.unitId } })
    : null;

  return (
    <main className="min-h-[100dvh] px-6 py-10 max-w-3xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm opacity-70 mt-1">{authUser.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="text-sm px-3 py-1.5 rounded-md border" style={{ borderColor: "currentColor" }}>
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-6 p-4 rounded-md border text-sm" style={{ borderColor: "currentColor" }}>
        {building ? (
          <p>
            <strong>{building.name}</strong>
            {unit ? ` · Unit ${unit.unitNumber}` : ""} · Role: {appUser.role}
          </p>
        ) : (
          <p className="opacity-70">
            Your account is not yet linked to a building. Ask your Building Manager to assign you.
          </p>
        )}
      </section>

      <nav className="mt-8 grid sm:grid-cols-2 gap-3">
        <Link
          href="/dashboard/maintenance"
          className="block p-4 rounded-md border hover:opacity-80"
          style={{ borderColor: "currentColor" }}
        >
          <div className="font-medium">Maintenance</div>
          <div className="text-sm opacity-60">Request a repair, see open tickets</div>
        </Link>
        <Link
          href="/dashboard/announcements"
          className="block p-4 rounded-md border hover:opacity-80"
          style={{ borderColor: "currentColor" }}
        >
          <div className="font-medium">Announcements</div>
          <div className="text-sm opacity-60">Notices from your building team</div>
        </Link>
      </nav>
    </main>
  );
}
