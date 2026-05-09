import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { formatRelative, formatDateShort } from "@/lib/format";
import { LogDeliveryForm } from "./LogDeliveryForm";
import { PickedUpButton } from "./PickedUpButton";

// Concierge / BM package log. Log a new delivery on the left, see
// pending pickups on the right with one-tap mark-as-picked-up.

export default async function TeamPackagesPage() {
  const { appUser } = await requireTeam();
  if (appUser.role !== "concierge" && appUser.role !== "building_manager") {
    redirect("/team");
  }
  if (!appUser.buildingId) redirect("/team");

  const [residents, pending, recent] = await Promise.all([
    prisma.user.findMany({
      where: {
        buildingId: appUser.buildingId,
        role: { in: ["resident", "tenant"] },
        isActive: true,
        archivedAt: null,
      },
      select: {
        id: true, name: true, email: true,
        unitRel: { select: { unitNumber: true } },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }).catch(() => []),
    prisma.delivery.findMany({
      where: { buildingId: appUser.buildingId, status: "pending" },
      orderBy: { receivedAt: "desc" },
      include: {
        recipient: { select: { name: true, email: true, unitRel: { select: { unitNumber: true } } } },
      },
    }).catch(() => []),
    prisma.delivery.findMany({
      where: { buildingId: appUser.buildingId, status: { not: "pending" } },
      orderBy: { pickedUpAt: "desc" },
      take: 10,
      include: {
        recipient: { select: { name: true, email: true } },
      },
    }).catch(() => []),
  ]);

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto pb-12">
      <div className="space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Concierge
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Package log</h1>
        <p className="text-sm text-muted-foreground">
          Log incoming packages. Residents get a push notification with their pickup code.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Log a new delivery
          </h2>
          {residents.length === 0 ? (
            <div className="bg-card border border-border rounded-md p-5 text-sm text-muted-foreground">
              No residents in this building yet. Add residents from{" "}
              <span className="font-mono">/team/residents</span> first.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-md p-5">
              <LogDeliveryForm
                residents={residents.map((r) => ({
                  id: r.id,
                  label: r.name || r.email,
                  unit: r.unitRel?.unitNumber ?? null,
                }))}
              />
            </div>
          )}
        </section>

        <section>
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Waiting for pickup · {pending.length}
          </h2>
          {pending.length === 0 ? (
            <div className="bg-card border border-border rounded-md p-5 text-sm text-muted-foreground">
              Nothing waiting. The bin is clear.
            </div>
          ) : (
            <ul className="bg-card border border-border rounded-md divide-y divide-border">
              {pending.map((d) => (
                <li key={d.id} className="px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{d.sender}</span>
                      <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                        {d.pickupCode}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {d.recipient.name || d.recipient.email}
                      {d.recipient.unitRel?.unitNumber ? ` · Unit ${d.recipient.unitRel.unitNumber}` : ""}
                      <span> · {formatRelative(d.receivedAt)}</span>
                    </div>
                    {d.description && (
                      <div className="text-xs text-muted-foreground/85 mt-1 truncate">{d.description}</div>
                    )}
                  </div>
                  <PickedUpButton id={d.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Recently picked up
          </h2>
          <ul className="bg-card border border-border rounded-md divide-y divide-border">
            {recent.map((d) => (
              <li key={d.id} className="px-4 py-3 text-sm flex items-center justify-between gap-3 opacity-75">
                <div className="min-w-0">
                  <span className="font-medium">{d.sender}</span>
                  <span className="text-muted-foreground"> · {d.recipient.name || d.recipient.email}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {d.pickedUpAt ? formatDateShort(d.pickedUpAt) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
