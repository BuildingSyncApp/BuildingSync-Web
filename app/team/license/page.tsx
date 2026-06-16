import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { daysRemaining } from "@/lib/license";
import { formatRelative, formatDateShort } from "@/lib/format";
import { LicenseForm } from "./LicenseForm";

// BM-only license + subscription management page. Mirrors the v2 R&D
// "Enterprise License" reference: read-only summary, paste-to-validate
// signed key, send-heartbeat, degraded-state notes.

function StatField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-md px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default async function LicensePage({
  searchParams,
}: {
  searchParams?: Promise<{ validated?: string }>;
}) {
  const { appUser } = await requireTeam();
  if (!can(appUser, "license.manage")) redirect("/team");
  if (!appUser.buildingId) redirect("/team");

  const params = (await searchParams) || {};
  const justValidated = params.validated === "1";

  const license = await prisma.license
    .findUnique({ where: { buildingId: appUser.buildingId } })
    .catch(() => null);

  const days = daysRemaining(license?.expiresAt ?? null);
  const expired = license?.expiresAt ? license.expiresAt < new Date() : false;
  const accessLabel = !license
    ? "No license on file"
    : expired
      ? "Expired — read-only"
      : "Full access";
  const accessTone = !license
    ? "border-border text-muted-foreground bg-muted/40"
    : expired
      ? "border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-500/10"
      : "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10";

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-4xl mx-auto pb-12">
      <Link
        href="/team/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to settings
      </Link>

      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        Licensing
      </p>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Enterprise License</h1>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        On-prem uses signed licenses with graceful degraded states. SaaS mode remains validated by
        hosted auth and subscription checks.
      </p>

      {justValidated && (
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300" role="status">
          License validated and saved.
        </div>
      )}

      <section className="mt-6 bg-card border border-border rounded-md p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border border-border bg-background">
            Mode: {license?.mode?.toUpperCase() ?? "SAAS"}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border border-border bg-background">
            Plan: {(license?.plan ?? "essential").toUpperCase()}
          </span>
          <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border ${accessTone}`}>
            {accessLabel}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Validated by SaaS auth and subscription provider.
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatField label="Customer" value={license?.customer ?? "n/a"} />
          <StatField label="Product" value={license?.product ?? "BuildingSync SaaS"} />
          <StatField
            label="Seat limit"
            value={license?.seatLimit ? String(license.seatLimit) : "n/a"}
          />
          <StatField
            label="Days remaining"
            value={days !== null ? `${days}` : "n/a"}
            hint={license?.expiresAt ? `Expires ${formatDateShort(license.expiresAt)}` : undefined}
          />
          <StatField
            label="AI enabled"
            value={license?.aiEnabled ? "Yes" : "No"}
            hint="Toggle requires a re-issued key."
          />
          <StatField
            label="Capabilities"
            value={license?.capabilities?.length ? license.capabilities.join(", ") : "n/a"}
          />
          {license?.lastHeartbeatAt && (
            <StatField
              label="Last heartbeat"
              value={formatRelative(license.lastHeartbeatAt)}
            />
          )}
        </div>
      </section>

      <section className="mt-6 bg-card border border-border rounded-md p-5">
        <h2 className="text-base font-semibold">Validate Signed License Key</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a key issued by your account manager. Format: <span className="font-mono text-xs">payload.signature</span>.
          Stored encrypted-at-rest in Postgres.
        </p>
        <LicenseForm hasLicense={Boolean(license)} />
      </section>

      <section className="mt-6 bg-card border border-border rounded-md p-5">
        <h2 className="text-base font-semibold">Degraded states</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
          <li>
            <span className="font-medium text-foreground">Expired license:</span> system becomes
            read-only and AI queries are disabled.
          </li>
          <li>
            <span className="font-medium text-foreground">Heartbeat missed (on-prem):</span>{" "}
            5-day grace before degraded mode kicks in.
          </li>
          <li>
            <span className="font-medium text-foreground">Seat over-limit:</span> new staff
            invitations are blocked; existing users continue working.
          </li>
        </ul>
      </section>
    </main>
  );
}
