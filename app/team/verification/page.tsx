import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { formatDateShort, formatRelative } from "@/lib/format";

// BM-only verification status + history page. Shows current status,
// countdown to next review, and the full chronological list of admin
// reviews with the company / licence / insurance facts captured at
// each. Read-only from the BM side; renewal happens via email →
// admin review → /platform/verifications/[userId]/review.

export default async function TeamVerificationPage() {
  const { authUser, appUser } = await requireTeam();
  if (appUser.role !== "building_manager") redirect("/team");

  const verifications = await prisma.managerVerification
    .findMany({
      where: { userId: appUser.id },
      orderBy: { reviewedAt: "desc" },
      include: { reviewedBy: { select: { name: true, email: true } } },
    })
    .catch(() => []);

  const now = new Date();
  const dueAt = appUser.nextVerificationDue;
  const daysOut = dueAt
    ? Math.round((dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const status: {
    label: string;
    description: string;
    tone: "good" | "info" | "warning" | "overdue" | "pending";
  } =
    !appUser.verifiedAt
      ? { label: "Pending admin review", description: "Your account is awaiting first verification.", tone: "pending" }
      : daysOut === null
      ? { label: "Verified", description: "No upcoming review on file.", tone: "good" }
      : daysOut < 0
      ? { label: `Overdue by ${Math.abs(daysOut)} days`, description: "Your verification has lapsed. Submit updated docs to restore active status.", tone: "overdue" }
      : daysOut <= 30
      ? { label: `Due in ${daysOut} days`, description: "Renewal needed soon.", tone: "warning" }
      : daysOut <= 60
      ? { label: `Due in ${daysOut} days`, description: "Renewal coming up.", tone: "info" }
      : { label: `Verified through ${formatDateShort(dueAt!)}`, description: "Next review on the calendar.", tone: "good" };

  const subject = encodeURIComponent(
    `Re-verification request — ${appUser.company ?? "Management company"}`,
  );
  const bodyText = encodeURIComponent(
    `Hi BuildingSync team,

I'm requesting re-verification.

Account email: ${authUser.email}
Company: ${appUser.company ?? "(please ask)"}

I'll send updated CMRAO licence + insurance proof on reply.

Thanks.`,
  );
  const renewMailto = `mailto:info@buildingsync.app?subject=${subject}&body=${bodyText}`;

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-3xl mx-auto">
      <div className="space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Building Manager
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Verification</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          BuildingSync verifies management companies against the Ontario
          Business Registry + CMRAO on a regular cycle. It keeps the
          building&apos;s records defensible at the LTB and with insurers.
          See{" "}
          <Link href="/legal" className="text-accent hover:underline">
            Legal &amp; compliance
          </Link>{" "}
          for the underlying statutes.
        </p>
      </div>

      {/* ─── Current status ─────────────────────────────────────── */}
      <section className="mt-8 bg-card border border-border rounded-xl p-5 md:p-6">
        <StatusBadge tone={status.tone} />
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">{status.label}</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{status.description}</p>

        <div className="mt-5 grid sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-background border border-border rounded-md p-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Company
            </p>
            <p className="mt-1 font-medium truncate">{appUser.company ?? "—"}</p>
          </div>
          <div className="bg-background border border-border rounded-md p-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              CMRAO licence
            </p>
            <p className="mt-1 font-mono text-xs truncate">{appUser.licenseNumber ?? "—"}</p>
          </div>
          <div className="bg-background border border-border rounded-md p-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Last reviewed
            </p>
            <p className="mt-1 text-xs">
              {appUser.lastVerifiedAt
                ? formatDateShort(appUser.lastVerifiedAt)
                : appUser.verifiedAt
                ? formatDateShort(appUser.verifiedAt)
                : "—"}
            </p>
          </div>
        </div>

        {(status.tone === "warning" || status.tone === "overdue" || status.tone === "info") && (
          <div className="mt-5">
            <a
              href={renewMailto}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              Request re-verification →
            </a>
          </div>
        )}
      </section>

      {/* ─── History ───────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Review history · {verifications.length}
        </h2>
        {verifications.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-md p-6 text-sm text-muted-foreground">
            No reviews yet. Once a platform admin reviews your account, the
            snapshot will appear here for the record.
          </div>
        ) : (
          <ul className="space-y-3">
            {verifications.map((v) => (
              <li key={v.id} className="bg-card border border-border rounded-md p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {v.status === "approved"
                        ? "Approved"
                        : v.status === "expired"
                        ? "Expired"
                        : v.status === "rejected"
                        ? "Rejected"
                        : v.status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reviewed by{" "}
                      <span className="text-foreground">
                        {v.reviewedBy?.name || v.reviewedBy?.email || "BuildingSync admin"}
                      </span>
                      {" "}· {formatRelative(v.reviewedAt)}
                      {v.validUntil && v.status === "approved" && (
                        <> · valid through {formatDateShort(v.validUntil)}</>
                      )}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm border ${
                      v.status === "approved"
                        ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5"
                        : v.status === "expired"
                        ? "border-rose-500/40 text-rose-700 dark:text-rose-400 bg-rose-500/5"
                        : "border-border text-muted-foreground bg-muted/30"
                    }`}
                  >
                    {v.status}
                  </span>
                </div>

                <dl className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <Fact label="Company" value={v.companyName} />
                  <Fact label="Manager type" value={v.managerType.replace(/_/g, " ")} />
                  <Fact label="Business number" value={v.businessNumber} mono />
                  <Fact label="CMRAO licence" value={v.licenseNumber} mono />
                  <Fact
                    label="Licence expires"
                    value={v.licenseExpiresAt ? formatDateShort(v.licenseExpiresAt) : null}
                  />
                  <Fact label="Insurance carrier" value={v.insuranceCarrier} />
                  <Fact label="Insurance policy" value={v.insurancePolicyNum} mono />
                  <Fact
                    label="Insurance expires"
                    value={v.insuranceExpiresAt ? formatDateShort(v.insuranceExpiresAt) : null}
                  />
                  <Fact label="Trust account bank" value={v.trustAccountBank} />
                  <Fact
                    label="Fidelity bond"
                    value={v.fidelityBondAmount ? `$${v.fidelityBondAmount.toLocaleString()}` : null}
                  />
                  <Fact label="Manages reserve fund" value={v.managesReserveFund ? "Yes" : "No"} />
                </dl>

                {v.notes && (
                  <div className="mt-4 pt-3 border-t border-border/60">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                      Admin notes
                    </p>
                    <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {v.notes}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-xs text-muted-foreground leading-relaxed">
        Records here are append-only — every admin review is preserved
        as a snapshot. This page is what you&apos;d show to the LTB or
        to your insurance broker as proof of due diligence.
      </p>
    </main>
  );
}

function StatusBadge({ tone }: { tone: "good" | "info" | "warning" | "overdue" | "pending" }) {
  const config = {
    good: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", label: "Verified" },
    info: { dot: "bg-sky-500", text: "text-sky-700 dark:text-sky-300", label: "Renewal upcoming" },
    warning: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", label: "Renewal due" },
    overdue: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", label: "Overdue" },
    pending: { dot: "bg-muted-foreground", text: "text-muted-foreground", label: "Pending review" },
  }[tone];
  return (
    <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest">
      <span aria-hidden="true" className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span className={config.text}>{config.label}</span>
    </div>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`${mono ? "font-mono" : ""} ${value ? "text-foreground" : "text-muted-foreground"} truncate`}>
        {value || "—"}
      </dd>
    </>
  );
}
