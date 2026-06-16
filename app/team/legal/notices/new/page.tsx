import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { NOTICE_TEMPLATES, type NoticeType } from "@/lib/notices";
import { NewNoticeForm } from "./NewNoticeForm";

export default async function NewNoticePage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; tenant?: string }>;
}) {
  const { appUser } = await requireTeam();
  if (!can(appUser, "notice.manage")) redirect("/team");
  if (!appUser.buildingId) redirect("/team");

  const params = (await searchParams) || {};
  const selectedType = (params.type && NOTICE_TEMPLATES[params.type as NoticeType])
    ? (params.type as NoticeType)
    : null;

  const tenants = await prisma.user
    .findMany({
      where: {
        buildingId: appUser.buildingId,
        role: { in: ["resident", "tenant"] },
        archivedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        unitRel: { select: { unitNumber: true } },
        leases: {
          where: { archivedAt: null, buildingId: appUser.buildingId },
          orderBy: { leaseStartDate: "desc" },
          take: 1,
          select: { rentAmountMonthly: true },
        },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    })
    .catch(() => []);

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-3xl mx-auto pb-12">
      <Link
        href="/team/legal/notices"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to notices
      </Link>

      <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">New tenancy notice</h1>

      {!selectedType ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick the notice type. Each links to the official LTB rules.
          </p>
          <ul className="mt-6 space-y-3">
            {Object.values(NOTICE_TEMPLATES).map((t) => (
              <li key={t.type}>
                <Link
                  href={`/team/legal/notices/new?type=${t.type}${params.tenant ? `&tenant=${params.tenant}` : ""}`}
                  className="block bg-card border border-border rounded-md p-5 hover:border-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-widest px-2 py-0.5 rounded-sm border border-border bg-muted/40">
                      {t.type}
                    </span>
                    <span className="font-semibold">{t.shortTitle}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{t.blurb}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Min {t.minDaysToTermination} days before termination
                    {t.remediationDays !== null
                      ? ` · ${t.remediationDays}-day correction window`
                      : " · no correction allowed"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <NewNoticeForm
          type={selectedType}
          tenants={tenants.map((t) => ({
            id: t.id,
            label: t.name || t.email,
            unit: t.unitRel?.unitNumber ?? null,
            rentAmountMonthly: t.leases[0]?.rentAmountMonthly ?? null,
          }))}
          presetTenantId={params.tenant ?? null}
        />
      )}
    </main>
  );
}
