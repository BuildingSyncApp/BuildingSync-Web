import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminResidentsPage() {
  const { appUser } = await requireAdmin();

  if (!appUser.buildingId) {
    return (
      <main className="px-6 py-10 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold">Residents</h1>
        <p className="mt-3 opacity-70 text-sm">No building assigned to your account.</p>
      </main>
    );
  }

  const residents = await prisma.user.findMany({
    where: {
      buildingId: appUser.buildingId,
      role: { in: ["resident", "tenant"] },
    },
    include: { unit: { select: { unitNumber: true } } },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  return (
    <main className="px-6 py-10 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">Residents</h1>
      <p className="mt-1 text-sm opacity-60">{residents.length} in this building</p>

      {residents.length === 0 ? (
        <p className="mt-6 text-sm opacity-70">No residents linked yet.</p>
      ) : (
        <ul className="mt-6 divide-y" style={{ borderColor: "currentColor" }}>
          {residents.map((r) => (
            <li key={r.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{r.name || r.email}</div>
                <div className="text-xs opacity-60">{r.email}</div>
              </div>
              <div className="text-sm opacity-70 flex items-center gap-3">
                {r.unit && <span>Unit {r.unit.unitNumber}</span>}
                <span className="text-xs uppercase tracking-wide px-2 py-0.5 rounded border" style={{ borderColor: "currentColor" }}>
                  {r.role}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs opacity-50">
        Inviting + unit-assignment land in next iteration. For R1, residents self-sign-up at /signup, then a script links them.
      </p>
    </main>
  );
}
