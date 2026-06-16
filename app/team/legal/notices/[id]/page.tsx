import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import {
  NOTICE_TEMPLATES,
  earliestTerminationDate,
  remediationDeadline,
  formatLongDate,
  formatMoney,
  type NoticeType,
  type N4Payload,
  type N5Payload,
  type N12Payload,
} from "@/lib/notices";
import { NoticeActions } from "./NoticeActions";

const STATUS_TONES: Record<string, string> = {
  draft: "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10",
  served: "border-sky-500/30 text-sky-700 dark:text-sky-400 bg-sky-500/10",
  resolved: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
  withdrawn: "border-border text-muted-foreground bg-muted/40",
};

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { appUser } = await requireTeam();
  if (!can(appUser, "notice.manage")) redirect("/team");
  if (!appUser.buildingId) redirect("/team");

  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice || notice.buildingId !== appUser.buildingId) notFound();

  const tpl = NOTICE_TEMPLATES[notice.type as NoticeType];
  const tone = STATUS_TONES[notice.status] ?? STATUS_TONES.withdrawn;

  const [tenant, lease, building, landlord] = await Promise.all([
    notice.tenantUserId
      ? prisma.user.findUnique({
          where: { id: notice.tenantUserId },
          select: {
            id: true, name: true, email: true,
            unitRel: { select: { unitNumber: true, floor: true } },
          },
        })
      : Promise.resolve(null),
    notice.leaseId
      ? prisma.lease.findUnique({ where: { id: notice.leaseId } })
      : Promise.resolve(null),
    prisma.building.findUnique({ where: { id: notice.buildingId } }),
    prisma.user.findUnique({
      where: { id: notice.createdById },
      select: { name: true, email: true },
    }),
  ]);

  // For preview/printing we use today as the prospective service date
  // until the BM actually marks the notice served. Once served we use
  // the recorded servedAt.
  const previewServedAt = notice.servedAt ?? new Date();
  const earliestTermination = earliestTerminationDate(notice.type as NoticeType, previewServedAt);
  const remediationBy = notice.remediationBy ?? remediationDeadline(notice.type as NoticeType, previewServedAt);

  const payload = notice.payload as unknown as N4Payload | N5Payload | N12Payload;

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-3xl mx-auto pb-12">
      {/* Screen-only chrome — hidden on print */}
      <div className="print:hidden">
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

        <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs uppercase tracking-widest px-2 py-0.5 rounded-sm border border-border bg-muted/40">
              {notice.type}
            </span>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{tpl?.shortTitle ?? notice.type}</h1>
            <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${tone}`}>
              {notice.status}
            </span>
          </div>
        </div>

        <NoticeActions
          id={notice.id}
          status={notice.status}
        />

        <p className="mt-2 text-xs text-muted-foreground">
          This is an LTB-style notice for service. Tribunal filings still require the official form
          from <a href="https://tribunalsontario.ca/ltb/forms/" target="_blank" rel="noopener" className="text-accent hover:underline">tribunalsontario.ca/ltb/forms</a>.
        </p>
      </div>

      {/* Printable notice document */}
      <article className="mt-8 bg-card border border-border rounded-md p-8 md:p-12 print:border-0 print:shadow-none print:p-0">
        <header>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Form {notice.type} · Residential Tenancies Act, 2006
          </p>
          <h2 className="mt-2 text-xl md:text-2xl font-semibold leading-tight">
            {tpl?.title}
          </h2>
        </header>

        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">To (tenant)</p>
            <p className="mt-1 font-semibold">{tenant?.name || tenant?.email || "—"}</p>
            <p className="text-muted-foreground">
              {building?.name}{tenant?.unitRel?.unitNumber ? `, Unit ${tenant.unitRel.unitNumber}` : ""}
            </p>
            <p className="text-muted-foreground">
              {building?.address}, {building?.city}, {building?.state} {building?.zipCode}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">From (landlord)</p>
            <p className="mt-1 font-semibold">{landlord?.name || landlord?.email}</p>
            <p className="text-muted-foreground">
              c/o {building?.name}
            </p>
            <p className="text-muted-foreground">
              {notice.servedAt
                ? `Served ${formatLongDate(notice.servedAt)} (${notice.servedMethod?.replace("_", " ")})`
                : `Drafted ${formatLongDate(notice.createdAt)} — not yet served`}
            </p>
          </div>
        </section>

        {notice.type === "N4" && (
          <N4Body payload={payload as N4Payload} earliestTermination={earliestTermination} remediationBy={remediationBy} />
        )}
        {notice.type === "N5" && (
          <N5Body payload={payload as N5Payload} earliestTermination={earliestTermination} remediationBy={remediationBy} />
        )}
        {notice.type === "N12" && (
          <N12Body payload={payload as N12Payload} earliestTermination={earliestTermination} lease={lease ? { rentAmountMonthly: lease.rentAmountMonthly } : null} />
        )}

        <footer className="mt-10 pt-6 border-t border-border text-sm">
          <p>Signed,</p>
          <div className="mt-8">
            <p className="border-t border-foreground inline-block min-w-[16rem] pt-1 text-xs uppercase tracking-widest text-muted-foreground">
              Landlord signature
            </p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{landlord?.name || landlord?.email}</p>
        </footer>

        <div className="mt-8 print:hidden text-xs text-muted-foreground border-t border-border pt-4">
          <strong className="text-foreground">Reference id:</strong> {notice.id}
        </div>
      </article>
    </main>
  );
}

function N4Body({
  payload,
  earliestTermination,
  remediationBy,
}: {
  payload: N4Payload;
  earliestTermination: Date;
  remediationBy: Date | null;
}) {
  return (
    <section className="mt-8 text-sm leading-relaxed space-y-4">
      <p>
        You are receiving this notice because you owe the rent listed below. The total amount you
        owe as of the date of this notice is{" "}
        <strong>{formatMoney(payload.totalOwing)}</strong>.
      </p>
      <table className="w-full border border-border text-left">
        <thead className="bg-muted/40 text-xs uppercase tracking-widest">
          <tr>
            <th className="px-3 py-2 font-semibold">Rental period</th>
            <th className="px-3 py-2 font-semibold text-right">Amount owing</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payload.arrearsBreakdown.map((row, i) => (
            <tr key={i}>
              <td className="px-3 py-2">{row.period}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.amount)}</td>
            </tr>
          ))}
          <tr className="bg-muted/30">
            <td className="px-3 py-2 font-semibold">Total</td>
            <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMoney(payload.totalOwing)}</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Termination date:</strong> {formatLongDate(earliestTermination)} or later. You must
        move out of the rental unit by this date if you do not pay the amount owing.
      </p>
      {remediationBy && (
        <p>
          <strong>What you can do to void this notice:</strong> Pay {formatMoney(payload.amountToVoid)}{" "}
          to the landlord by {formatLongDate(remediationBy)}. If you pay this amount in full by that
          date, this notice is void and you do not have to move out.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        If you do not pay and do not move out, the landlord may file an application with the Landlord
        and Tenant Board to terminate your tenancy and evict you.
      </p>
    </section>
  );
}

function N5Body({
  payload,
  earliestTermination,
  remediationBy,
}: {
  payload: N5Payload;
  earliestTermination: Date;
  remediationBy: Date | null;
}) {
  const reasonLabel = {
    interference: "substantially interfering with the reasonable enjoyment of others",
    damage: "willfully or negligently damaging the rental unit or building",
    overcrowding: "having too many people living in the rental unit",
  }[payload.reason];
  return (
    <section className="mt-8 text-sm leading-relaxed space-y-4">
      <p>You are receiving this notice because of {reasonLabel}.</p>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Incident{payload.incidents.length > 1 ? "s" : ""}
        </p>
        <ul className="space-y-2">
          {payload.incidents.map((i, idx) => (
            <li key={idx} className="border border-border rounded-md px-3 py-2">
              <div className="text-xs text-muted-foreground">{i.date}</div>
              <div className="mt-1 whitespace-pre-wrap">{i.description}</div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
          Remedy required
        </p>
        <p className="whitespace-pre-wrap">{payload.remedyRequested}</p>
      </div>
      <p>
        <strong>Termination date:</strong> {formatLongDate(earliestTermination)} or later.
      </p>
      {remediationBy && !payload.isSecondNoticeWithinSixMonths && (
        <p>
          <strong>How to void this notice:</strong> If you stop the activity or correct the problem
          within 7 days — by {formatLongDate(remediationBy)} — this notice is void.
        </p>
      )}
      {payload.isSecondNoticeWithinSixMonths && (
        <p className="text-rose-700 dark:text-rose-400">
          <strong>Second notice within 6 months — no correction window applies.</strong>
        </p>
      )}
    </section>
  );
}

function N12Body({
  payload,
  earliestTermination,
  lease,
}: {
  payload: N12Payload;
  earliestTermination: Date;
  lease: { rentAmountMonthly: number } | null;
}) {
  const beneficiaryLabel = {
    landlord: "the landlord",
    spouse: "the landlord's spouse",
    child: "the landlord's child",
    parent: "the landlord's parent",
    caregiver: "a caregiver",
    purchaser: "a purchaser",
  }[payload.beneficiary];
  const compensation = lease ? lease.rentAmountMonthly * payload.compensationMonths : null;
  return (
    <section className="mt-8 text-sm leading-relaxed space-y-4">
      <p>
        You are receiving this notice because {beneficiaryLabel}{" "}
        <strong>{payload.beneficiaryName}</strong> requires the rental unit for residential
        occupation in good faith.
      </p>
      <p>
        <strong>Termination date:</strong> {formatLongDate(earliestTermination)} or later. You must
        move out of the rental unit by this date.
      </p>
      <p>
        <strong>Compensation:</strong> One month&apos;s rent
        {compensation !== null && ` (${formatMoney(compensation)})`} or an alternative rental unit
        acceptable to you, as required by section 48.1 of the Residential Tenancies Act, 2006.
      </p>
      {payload.affidavitAttached ? (
        <p className="text-xs text-muted-foreground">Affidavit of good faith attached.</p>
      ) : (
        <p className="text-xs text-rose-700 dark:text-rose-400">
          Affidavit of good faith NOT attached — required for any LTB application.
        </p>
      )}
    </section>
  );
}
