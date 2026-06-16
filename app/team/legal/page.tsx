import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

// Legal hub for the BM. Today: Ontario RTA notices. Lease renewals
// + insurance certs + compliance calendar land in subsequent rounds.

export default async function LegalHomePage() {
  const { appUser } = await requireTeam();
  if (!can(appUser, "notice.manage")) redirect("/team");
  if (!appUser.buildingId) redirect("/team");

  const noticeCounts = await prisma.notice
    .groupBy({
      by: ["status"],
      where: { buildingId: appUser.buildingId },
      _count: true,
    })
    .catch(() => []);

  const draft = noticeCounts.find((c) => c.status === "draft")?._count ?? 0;
  const served = noticeCounts.find((c) => c.status === "served")?._count ?? 0;

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto pb-12">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        Building Manager
      </p>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Legal</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
        Tenancy notices, lease lifecycle, and compliance tracking. Templates produce LTB-style
        notices ready to print and serve — official LTB filings still need the form from
        tribunalsontario.ca.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/team/legal/notices"
          className="bg-card border border-border rounded-md p-5 hover:border-accent transition-colors block"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Tenancy notices</h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              N4 · N5 · N12
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate and track Ontario RTA notices: rent default, substantial breach, landlord&apos;s
            own use. Service tracking + audit-grade records.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            <span className="text-foreground font-semibold">{draft}</span> draft ·{" "}
            <span className="text-foreground font-semibold">{served}</span> served
          </p>
        </Link>

        <div className="bg-card border border-border rounded-md p-5 opacity-70">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Lease lifecycle</h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Coming soon
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Renewal reminders 60 days before expiry, term + rent change negotiation, signed copies
            stored alongside the lease.
          </p>
        </div>

        <div className="bg-card border border-border rounded-md p-5 opacity-70">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Compliance calendar</h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Coming soon
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Fire alarm tests, elevator inspections, fire drills — recurring tasks audit-logged when
            completed.
          </p>
        </div>

        <div className="bg-card border border-border rounded-md p-5 opacity-70">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Insurance certificates</h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Coming soon
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Track vendor + tenant insurance expiry, automatic reminders before lapse.
          </p>
        </div>
      </div>
    </main>
  );
}
