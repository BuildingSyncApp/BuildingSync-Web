import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateShort, formatRelative } from "@/lib/format";
import { isStripeEnabled } from "@/lib/stripe";
import { PayNowButton } from "./PayNowButton";

// Rent payment landing page. Shows the active lease's monthly rent plus
// the tenant's payment history. "Pay rent" calls /api/stripe/checkout
// which creates a Stripe Checkout Session and redirects. Tenant-only;
// owner-residents don't pay rent through the platform (deferred to R2).

function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

const STATUS_TONES: Record<string, string> = {
  succeeded: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  pending:   "bg-amber-500/10   border-amber-500/30   text-amber-700   dark:text-amber-400",
  failed:    "bg-rose-500/10    border-rose-500/30    text-rose-700    dark:text-rose-400",
  refunded:  "bg-muted/40       border-border         text-muted-foreground",
};

export default async function PaymentsPage() {
  const { appUser } = await requireUser();

  // Tenants only — residents who own their unit don't pay rent here.
  if (appUser.role !== "tenant") redirect("/dashboard");

  const stripeEnabled = isStripeEnabled();
  const now = new Date();

  const [activeLease, history] = await Promise.all([
    prisma.lease
      .findFirst({
        where: {
          tenantId: appUser.id,
          status: { not: "archived" },
          archivedAt: null,
          leaseEndDate: { gte: now },
        },
        orderBy: { leaseStartDate: "desc" },
        include: { unit: { select: { unitNumber: true } } },
      })
      .catch(() => null),
    prisma.payment
      .findMany({
        where: { userId: appUser.id },
        orderBy: { createdAt: "desc" },
        take: 12,
      })
      .catch(() => []),
  ]);

  return (
    <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto pb-12">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </Link>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Pay rent</h1>

      {!stripeEnabled && (
        <div
          className="mt-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-5"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Online rent payments are pending compliance approval
              </p>
              <p className="mt-1 text-sm text-amber-900/85 dark:text-amber-200/85 leading-relaxed">
                Our payment processor is still reviewing the application. You can&apos;t pay rent
                online here yet — please continue paying through your existing arrangement with
                your landlord. We&apos;ll email you the moment online payments are live.
              </p>
            </div>
          </div>
        </div>
      )}

      {!activeLease ? (
        <div className="mt-6 bg-card border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            We couldn&apos;t find an active lease on your account. Ask your Building Manager to confirm
            your lease is set up — once it is, you&apos;ll see the rent amount and a Pay button here.
          </p>
        </div>
      ) : (
        <section className="mt-6 bg-card border border-border rounded-xl p-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Monthly rent · Unit {activeLease.unit.unitNumber}
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                {formatMoney(activeLease.rentAmountMonthly)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Lease through {formatDateShort(activeLease.leaseEndDate)}
            </p>
          </div>
          {stripeEnabled ? (
            <>
              <PayNowButton leaseId={activeLease.id} amount={activeLease.rentAmountMonthly} />
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                Stripe processing fees on rent are absorbed by the property manager — never charged to
                you (Ontario RTA s. 134). Your card data is handled directly by Stripe; BuildingSync
                never sees it.
              </p>
            </>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="mt-4 w-full sm:w-auto px-5 py-2.5 rounded-md bg-muted text-muted-foreground font-semibold cursor-not-allowed"
              title="Online rent payments are pending compliance approval"
            >
              Pay rent · pending compliance
            </button>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Payment history
        </h2>
        {history.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            No payments yet. Once you pay rent it&apos;ll show here.
          </div>
        ) : (
          <ul className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
            {history.map((p) => {
              const tone = STATUS_TONES[p.status] || STATUS_TONES.pending;
              return (
                <li key={p.id} className="px-5 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold tabular-nums">
                      {formatMoney(p.amount, p.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.paidAt
                        ? `Paid ${formatRelative(p.paidAt)}`
                        : `Initiated ${formatRelative(p.createdAt)}`}
                      {p.method ? ` · ${p.method}` : ""}
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border ${tone}`}>
                    {p.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
