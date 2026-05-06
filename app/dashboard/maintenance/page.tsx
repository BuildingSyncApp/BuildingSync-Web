import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MaintenanceForm } from "./MaintenanceForm";

export default async function MaintenancePage() {
  const { appUser } = await requireUser();

  const workOrders = await prisma.workOrder.findMany({
    where: { openedById: appUser.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <main className="min-h-[100dvh] px-6 py-10 max-w-3xl mx-auto">
      <Link href="/dashboard" className="text-sm opacity-70 hover:opacity-100">← Back</Link>
      <h1 className="mt-4 text-3xl font-semibold">Maintenance</h1>

      <section className="mt-8">
        <h2 className="text-lg font-medium">New request</h2>
        <MaintenanceForm hasBuilding={Boolean(appUser.buildingId)} />
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium">Your requests</h2>
        {workOrders.length === 0 ? (
          <p className="mt-2 text-sm opacity-70">No requests yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {workOrders.map((wo) => (
              <li
                key={wo.id}
                className="p-3 rounded-md border text-sm"
                style={{ borderColor: "currentColor" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{wo.title}</span>
                  <span className="text-xs uppercase tracking-wide opacity-60">{wo.status}</span>
                </div>
                <p className="mt-1 opacity-70">{wo.description}</p>
                <p className="mt-2 text-xs opacity-50">
                  Opened {new Date(wo.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
