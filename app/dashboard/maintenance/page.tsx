import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/EmptyState";
import { formatRelative } from "@/lib/format";
import { StatusPill, workOrderTone } from "@/components/StatusPill";
import { MaintenanceForm } from "./MaintenanceForm";

export default async function MaintenancePage() {
  const { appUser } = await requireUser();

  const workOrders = await prisma.workOrder.findMany({
    where: { openedById: appUser.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <main className="min-h-dvh px-4 md:px-6 py-8 md:py-10 max-w-3xl mx-auto">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Maintenance</h1>

      <section className="mt-8 bg-card border border-border rounded-md p-5">
        <h2 className="text-base font-semibold">New request</h2>
        <MaintenanceForm hasBuilding={Boolean(appUser.buildingId)} />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your requests</h2>
        {workOrders.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon="inbox"
              title="No requests yet"
              description="When you submit a request above, it'll show up here with the latest status."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {workOrders.map((wo) => (
              <li key={wo.id} className="bg-card border border-border rounded-md p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium">{wo.issue}</span>
                  <StatusPill label={wo.status.replace("_", " ")} tone={workOrderTone(wo.status)} />
                </div>
                {wo.description && <p className="mt-2 text-sm text-muted-foreground">{wo.description}</p>}
                <p className="mt-3 text-xs text-muted-foreground/85">
                  Opened {formatRelative(wo.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
