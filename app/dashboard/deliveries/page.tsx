import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateShort } from "@/lib/format";

// Resident delivery feed. Concierge logs packages on /team/packages with
// a recipient + pickup code; the recipient sees them here. "Pending"
// (not yet picked up) at the top, followed by a recently-picked-up tail.

export default async function DeliveriesPage() {
  const { appUser } = await requireUser();

  const deliveries = await prisma.delivery
    .findMany({
      where: { recipientUserId: appUser.id },
      orderBy: [{ status: "asc" }, { receivedAt: "desc" }],
      take: 50,
      select: {
        id: true,
        sender: true,
        description: true,
        pickupCode: true,
        status: true,
        receivedAt: true,
        pickedUpAt: true,
      },
    })
    .catch(() => []);

  const pending = deliveries.filter((d) => d.status === "pending");
  const picked = deliveries.filter((d) => d.status !== "pending");

  return (
    <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Deliveries</h1>

      {pending.length === 0 && picked.length === 0 ? (
        <div className="mt-6 bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
          No packages waiting. The concierge logs new deliveries here as they arrive — you&apos;ll get
          a pickup code when one is ready for you.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {pending.length > 0 && (
            <section>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">
                Waiting for pickup
              </p>
              <ul className="mt-2 space-y-2">
                {pending.map((d) => (
                  <li key={d.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                        <rect x="2" y="6" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{d.sender}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.description ? `${d.description} · ` : ""}{formatDateShort(d.receivedAt)}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                      {d.pickupCode}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {picked.length > 0 && (
            <section>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">
                Recently picked up
              </p>
              <ul className="mt-2 space-y-2">
                {picked.map((d) => (
                  <li key={d.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 opacity-70">
                    <span className="w-9 h-9 rounded-md bg-muted/40 text-muted-foreground flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{d.sender}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.description ? `${d.description} · ` : ""}
                        Picked up {d.pickedUpAt ? formatDateShort(d.pickedUpAt) : "—"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
