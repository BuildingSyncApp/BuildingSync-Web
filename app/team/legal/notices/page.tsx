import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatRelative } from "@/lib/format";
import { NOTICE_TEMPLATES, type NoticeType } from "@/lib/notices";

const STATUS_TONES: Record<string, string> = {
  draft: "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10",
  served: "border-sky-500/30 text-sky-700 dark:text-sky-400 bg-sky-500/10",
  resolved: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
  withdrawn: "border-border text-muted-foreground bg-muted/40",
};

export default async function NoticesListPage() {
  const { appUser } = await requireTeam();
  if (!can(appUser, "notice.manage")) redirect("/team");
  if (!appUser.buildingId) redirect("/team");

  const notices = await prisma.notice
    .findMany({
      where: { buildingId: appUser.buildingId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    })
    .catch(() => []);

  const tenantIds = Array.from(new Set(notices.map((n) => n.tenantUserId).filter(Boolean))) as string[];
  const tenants = tenantIds.length
    ? await prisma.user.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true, email: true, unitRel: { select: { unitNumber: true } } },
      })
    : [];
  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto pb-12">
      <Link
        href="/team/legal"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Legal
      </Link>

      <div className="mt-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Building Manager · Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Tenancy notices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ontario RTA notices generated, tracked, and audit-logged. Service date counts toward
            tribunal timelines.
          </p>
        </div>
        <Link
          href="/team/legal/notices/new"
          className="px-4 py-2 sm:px-3 sm:py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          + New notice
        </Link>
      </div>

      {notices.length === 0 ? (
        <div className="mt-8 bg-card border border-border rounded-md p-8 text-center">
          <p className="text-sm text-muted-foreground">No notices yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Templates available: {Object.values(NOTICE_TEMPLATES).map((t) => t.type).join(" · ")}
          </p>
        </div>
      ) : (
        <ul className="mt-8 bg-card border border-border rounded-md divide-y divide-border">
          {notices.map((n) => {
            const tenant = n.tenantUserId ? tenantById.get(n.tenantUserId) : undefined;
            const tone = STATUS_TONES[n.status] ?? STATUS_TONES.withdrawn;
            const tpl = NOTICE_TEMPLATES[n.type as NoticeType];
            return (
              <li key={n.id}>
                <Link
                  href={`/team/legal/notices/${n.id}`}
                  className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors flex-wrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs uppercase tracking-widest px-2 py-0.5 rounded-sm border border-border bg-muted/40">
                        {n.type}
                      </span>
                      <span className="font-medium truncate">
                        {tpl?.shortTitle ?? n.type}
                      </span>
                      <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${tone}`}>
                        {n.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {tenant ? (tenant.name || tenant.email) : "—"}
                      {tenant?.unitRel?.unitNumber ? ` · Unit ${tenant.unitRel.unitNumber}` : ""}
                      {n.servedAt
                        ? ` · served ${formatRelative(n.servedAt)}`
                        : ` · drafted ${formatRelative(n.createdAt)}`}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">View →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
