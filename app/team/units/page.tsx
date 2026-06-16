import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { AddUnitForm } from "./AddUnitForm";
import { BulkAddUnitsForm } from "./BulkAddUnitsForm";

export default async function TeamUnitsPage() {
  const { appUser } = await requireTeam();

  if (!appUser.buildingId) {
    return (
      <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight">Units</h1>
        <p className="mt-3 text-sm text-muted-foreground">No building assigned to your account.</p>
      </main>
    );
  }

  const units = await prisma.unit.findMany({
    where: { buildingId: appUser.buildingId },
    orderBy: [{ floor: "asc" }, { unitNumber: "asc" }],
    include: {
      _count: { select: { users: true } },
    },
  });

  const canManage = can(appUser, "unit.manage");
  const occupied = units.filter((u) => u._count.users > 0).length;

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight">Units</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {units.length} total · {occupied} occupied · {units.length - occupied} available
      </p>

      {canManage && (
        <div className="mt-8 grid lg:grid-cols-2 gap-3">
          <section className="bg-card border border-border rounded-md p-5">
            <h2 className="text-base font-semibold">Add a unit</h2>
            <p className="mt-1 text-xs text-muted-foreground">Floor and rent are optional.</p>
            <AddUnitForm />
          </section>
          <section className="bg-card border border-border rounded-md p-5">
            <h2 className="text-base font-semibold">Bulk import via CSV</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste or upload a list of units to import in one shot.
            </p>
            <BulkAddUnitsForm />
          </section>
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">All units</h2>
        {units.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No units yet. Add one above to start onboarding residents.</p>
        ) : (
          <div className="mt-3 bg-card border border-border rounded-md overflow-x-auto">
            <table className="w-full min-w-120 text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 sm:px-5 font-semibold">Unit</th>
                  <th className="text-left py-3 px-4 sm:px-5 font-semibold">Floor</th>
                  <th className="text-right py-3 px-4 sm:px-5 font-semibold">Rent</th>
                  <th className="text-right py-3 px-4 sm:px-5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {units.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4 sm:px-5 font-medium whitespace-nowrap">Unit {u.unitNumber}</td>
                    <td className="py-3 px-4 sm:px-5 text-muted-foreground">{u.floor ?? "—"}</td>
                    <td className="py-3 px-4 sm:px-5 text-right tabular-nums whitespace-nowrap">
                      {u.rentAmount ? `$${Number(u.rentAmount).toLocaleString()}` : "—"}
                    </td>
                    <td className="py-3 px-4 sm:px-5 text-right">
                      <span className={`text-[11px] sm:text-[10px] uppercase tracking-wider px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-sm border whitespace-nowrap ${u._count.users > 0 ? "bg-accent/10 text-accent border-accent/30" : "bg-muted/30 text-muted-foreground border-border"}`}>
                        {u._count.users > 0 ? "occupied" : "available"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
