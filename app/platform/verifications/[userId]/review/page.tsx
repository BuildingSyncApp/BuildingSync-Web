import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { formatDateShort, formatRelative } from "@/lib/format";
import { ReviewForm } from "./ReviewForm";

// Admin-side rich review form. Pre-fills from the BM's signup-
// captured facts + the most recent ManagerVerification (so re-
// reviews can update last-known values without re-typing).
// Surfaces one-click verification links to OBR / Corporations
// Canada / CMRAO so the admin can confirm before submitting.

export default async function ReviewVerificationPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requirePlatformAdmin();
  const { userId } = await params;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      verifiedAt: true,
      lastVerifiedAt: true,
      nextVerificationDue: true,
      company: true,
      managerType: true,
      businessNumber: true,
      licenseNumber: true,
      region: true,
      city: true,
      postalCode: true,
      createdAt: true,
    },
  });
  if (!target) notFound();
  if (target.role !== "building_manager") redirect("/platform");

  const lastReview = await prisma.managerVerification
    .findFirst({
      where: { userId: target.id },
      orderBy: { reviewedAt: "desc" },
      select: {
        licenseExpiresAt: true,
        trustAccountBank: true,
        insuranceCarrier: true,
        insurancePolicyNum: true,
        insuranceExpiresAt: true,
        managesReserveFund: true,
        fidelityBondAmount: true,
        notes: true,
        evidenceUrl: true,
      },
    })
    .catch(() => null);

  // External verification links — same pattern as the queue cards on
  // /platform, surfaced here for the reviewer to click before approving.
  const obrUrl = target.company
    ? `https://www.appmybizaccount.gov.on.ca/onbis/search?searchValue=${encodeURIComponent(target.company)}`
    : null;
  const cmraoUrl = target.licenseNumber
    ? `https://www.cmrao.ca/find-a-registrant?q=${encodeURIComponent(target.licenseNumber)}`
    : "https://www.cmrao.ca/find-a-registrant";
  const corpsCanadaUrl = target.businessNumber
    ? `https://www.ic.gc.ca/app/scr/cc/CorporationsCanada/fdrlCrpSrch.html?searchValue=${encodeURIComponent(target.businessNumber)}`
    : null;

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-3xl mx-auto">
      <Link
        href="/platform"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        ← Back to platform admin
      </Link>
      <div className="mt-4 space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {target.verifiedAt ? "Re-verify" : "First verification"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{target.name || target.email}</h1>
        <p className="text-sm text-muted-foreground">
          {target.email} · signed up {formatRelative(target.createdAt)}
          {target.lastVerifiedAt && (
            <> · last reviewed {formatRelative(target.lastVerifiedAt)}</>
          )}
        </p>
      </div>

      {/* External verification quick-links */}
      <section className="mt-6 bg-muted/30 border border-border rounded-md p-4">
        <p className="text-xs font-semibold text-foreground mb-2">
          Verify externally before approving →
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {obrUrl && (
            <a
              href={obrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted transition-colors"
            >
              Search Ontario Business Registry →
            </a>
          )}
          {corpsCanadaUrl && (
            <a
              href={corpsCanadaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted transition-colors"
            >
              Corporations Canada (BN) →
            </a>
          )}
          <a
            href={cmraoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted transition-colors"
          >
            CMRAO registrant lookup →
          </a>
        </div>
        {(!target.company || !target.businessNumber || !target.licenseNumber) && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Note: BM didn&apos;t provide
            {[
              !target.company && "company name",
              !target.businessNumber && "business number",
              !target.licenseNumber && "CMRAO licence",
            ].filter(Boolean).join(", ")}{" "}
            at signup. You may need to email them before approving.
          </p>
        )}
      </section>

      <section className="mt-6">
        <ReviewForm
          userId={target.id}
          email={target.email}
          defaults={{
            companyName: target.company,
            managerType: target.managerType,
            businessNumber: target.businessNumber,
            licenseNumber: target.licenseNumber,
            licenseExpiresAt: lastReview?.licenseExpiresAt ?? null,
            trustAccountBank: lastReview?.trustAccountBank ?? null,
            insuranceCarrier: lastReview?.insuranceCarrier ?? null,
            insurancePolicyNum: lastReview?.insurancePolicyNum ?? null,
            insuranceExpiresAt: lastReview?.insuranceExpiresAt ?? null,
            managesReserveFund: lastReview?.managesReserveFund ?? false,
            fidelityBondAmount: lastReview?.fidelityBondAmount ?? null,
            notes: lastReview?.notes ?? null,
            evidenceUrl: lastReview?.evidenceUrl ?? null,
          }}
        />
      </section>
    </main>
  );
}
