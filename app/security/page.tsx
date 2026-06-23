import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";

// Public-facing security + safety posture. Answers the questions a
// prospect, customer security team, or journalist asks in plain
// language: what does BuildingSync actually handle, what doesn't it,
// what happens when things break, what's the SLA, how exposed are
// you to ransomware / outages / vendor failure?
//
// Honest. No "we are SOC 2 certified" claims we can't back up.
// Distinguishes today's R1 posture from contractual commitments
// available under Enterprise.

export const metadata: Metadata = {
  title: "Security & safety — BuildingSync",
  description:
    "What BuildingSync handles, what it doesn't, how it's protected, what happens in an outage, and the SLAs available on each tier.",
};

export default function SecurityPage() {
  return (
    <AuthShell back={{ href: "/", label: "Home" }} width="wide">
      <div className="py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Trust</p>
        <h1
          className="mt-3 tracking-tight"
          style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2.25rem, 5vw, 3.5rem)" }}
        >
          SECURITY &amp; SAFETY
        </h1>
        <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
          Plain-language answers to the questions security teams,
          property managers, and residents ask before trusting us with
          their building&apos;s data. Written to be true today, not
          aspirationally.
        </p>

        <div className="mt-14 space-y-14 text-sm leading-relaxed text-foreground/90">

          {/* ─── Scope ─────────────────────────────────────── */}
          <Section eyebrow="01 · Scope" title="What BuildingSync handles — and what it doesn't">
            <Card title="What we handle">
              <ul className="space-y-1.5 list-disc pl-5">
                <li>Personal data: names, emails, phone numbers, units</li>
                <li>Building data: residents, units, leases, work orders, packages</li>
                <li>Communications: announcements, maintenance threads, notice templates</li>
                <li>Documents: bylaws, fire plans, lease scans (when uploaded)</li>
                <li>Audit log: every state change, append-only</li>
                <li>Rent payment routing (Stripe Checkout — when enabled)</li>
              </ul>
            </Card>
            <Card title="What we don't handle">
              <ul className="space-y-1.5 list-disc pl-5">
                <li>
                  <strong>Custody of funds.</strong> We don&apos;t hold rent. Stripe processes
                  payments directly into the property manager&apos;s account; BuildingSync
                  routes intent and records receipts.
                </li>
                <li>
                  <strong>Credit card data.</strong> Card numbers go directly to Stripe
                  Checkout. BuildingSync never sees, stores, or transmits them. PCI
                  scope is Stripe&apos;s, not ours.
                </li>
                <li>
                  <strong>Identity verification.</strong> We don&apos;t scan passports
                  or driver&apos;s licences. Identity is verified via email
                  confirmation plus (for Building Managers) admin review of the
                  Ontario Business Registry + CMRAO.
                </li>
                <li>
                  <strong>Health / medical records.</strong> Out of scope for R1.
                </li>
                <li>
                  <strong>Background checks on residents.</strong> Not our job;
                  landlords run their own per Ontario Human Rights Code.
                </li>
              </ul>
            </Card>
          </Section>

          {/* ─── Vulnerability surface ─────────────────────── */}
          <Section eyebrow="02 · Vulnerability surface" title="What an attacker would target">
            <Card title="Authentication">
              First-party auth: passwords are hashed with argon2id (the
              OWASP-recommended memory-hard algorithm); sessions are
              short-lived HMAC-signed tokens. Password reset via emailed
              time-limited token. No SMS-based auth (avoids SIM-swap
              class). MFA is on the roadmap.
            </Card>
            <Card title="Data at rest">
              All data lives in managed Postgres in the ca-central
              (Canada Central) region. Disk encryption is on by default
              at the provider level. Row-level security policies are
              applied; cross-tenant access requires explicit grants.
            </Card>
            <Card title="Data in transit">
              HTTPS only (HSTS enforced). Public DB ports are closed —
              the only path to data is through the BuildingSync API on
              the public web. The pooled connection uses a connection
              pooler in transaction mode; the direct connection is
              reserved for migrations.
            </Card>
            <Card title="Third-party trust boundary">
              We delegate to: our managed Postgres provider (DB),
              Cloudflare R2 (file storage), Vercel (hosting), Stripe
              (payments), Resend (transactional email), Anthropic
              (AI drafting — optional). Each has its own security posture
              and SOC 2 / equivalent attestation. We don&apos;t pull
              dependencies from random third parties — npm deps are
              monitored via Dependabot.
            </Card>
            <Card title="Application code">
              All server-side data access goes through Prisma — no raw
              SQL execution from user input. Server actions enforce
              role-based authorisation before every mutation. Audit log
              records IP + user-agent for every state-changing call.
            </Card>
          </Section>

          {/* ─── Availability ──────────────────────────────── */}
          <Section eyebrow="03 · Availability" title="What happens when things break">
            <Card title="During a partial cloud outage">
              The PWA shell is cached by the service worker, so users
              still see the app frame even when the network is degraded.
              Read-heavy pages render from cached responses for the few
              minutes after a Vercel edge fails over. Write actions
              (submit maintenance, post announcement) require a working
              database connection and fail with a retry-able error.
            </Card>
            <Card title="During a full Vercel outage">
              The app is unavailable. Vercel publishes incident updates
              at vercel-status.com. No user data is at risk — it lives
              in our managed Postgres database, which is independent.
            </Card>
            <Card title="During a full database outage">
              Sign-ins and writes fail until the database recovers.
              Existing in-flight sessions may continue to render cached
              pages. Sessions are stateless signed tokens, so they remain
              valid once connectivity returns.
            </Card>
            <Card title="During a full provider failure (worst case)">
              We have daily Postgres backups via our managed database
              provider, with point-in-time recovery enabled (5-minute
              granularity). Recovery target is &lt; 4 hours from
              decision to operational. The on-premise SKU is the answer
              for customers who can&apos;t accept any cloud-vendor risk —
              they run everything on their own hardware.
            </Card>
          </Section>

          {/* ─── Backup + recovery ─────────────────────────── */}
          <Section eyebrow="04 · Backup &amp; recovery" title="What's backed up, where, how often">
            <Card title="Cloud SKU">
              <ul className="space-y-1.5 list-disc pl-5">
                <li><strong>Postgres:</strong> daily snapshots retained 7 days on Pro tier, 14 days on Team tier, 30 days on Enterprise</li>
                <li><strong>Point-in-time recovery:</strong> 5-minute granularity, last 7 days (managed Postgres)</li>
                <li><strong>File storage:</strong> Cloudflare R2 stores documents in the selected region; versioning/replication available per bucket policy</li>
                <li><strong>Audit log:</strong> append-only Postgres table; covered by the same backup schedule</li>
                <li><strong>Customer-initiated export:</strong> per-user data export at /dashboard/account (PIPEDA Art. 4.9)</li>
              </ul>
            </Card>
            <Card title="On-premise SKU">
              The customer runs their own backup schedule via the
              shipped <code className="font-mono text-xs">scripts/backup.sh</code> helper
              (Postgres dump + MinIO mirror). Output is dropped in a
              configurable directory; customer&apos;s existing backup
              tooling picks it up. Documented in the on-prem deployment
              runbook.
            </Card>
          </Section>

          {/* ─── SLA ───────────────────────────────────────── */}
          <Section eyebrow="05 · SLA" title="What we promise on each tier">
            <Card title="Free pilot (90 days) and Essential ($2.50 / unit / month)">
              <strong>Best-effort.</strong> No formal uptime SLA. Status
              communicated by email when incidents are extended.
              Targeted at small property portfolios where the cost of
              an hour of downtime is the cost of using paper for an hour.
            </Card>
            <Card title="Enterprise">
              Negotiated per customer. Typical structure:
              <ul className="mt-2 space-y-1.5 list-disc pl-5">
                <li>99.5% monthly uptime target</li>
                <li>4-hour acknowledgement on Sev-1 (production down)</li>
                <li>1 business day on Sev-2 (feature broken, workaround exists)</li>
                <li>5 business days on Sev-3 (cosmetic / minor)</li>
                <li>Designated support contact during business hours</li>
                <li>Incident postmortem within 5 business days of resolution</li>
              </ul>
              See <Link href="/enterprise" className="text-accent hover:underline">Enterprise &amp; Government</Link> to scope.
            </Card>
            <Card title="On-premise SKU">
              Availability is the customer&apos;s responsibility — it runs
              on their hardware. Our SLA covers software support: critical
              patches within 72 hours of CVE disclosure, signed releases
              with SBOM, vulnerability disclosure list subscription.
            </Card>
          </Section>

          {/* ─── Incident response ─────────────────────────── */}
          <Section eyebrow="06 · Incident response" title="What we do when something goes wrong">
            <Card title="Detection">
              Vercel + our database provider send paging alerts to the
              on-call engineer for hard failures (5xx rates, DB
              connectivity). Customer-reported incidents arrive at <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">info@buildingsync.app</a>.
            </Card>
            <Card title="Communication">
              Active incidents acknowledged within the SLA window. Status
              updates posted every ~30 minutes during a Sev-1. Resolution
              email to affected customers when restored. A formal public
              status page is on the R2 roadmap.
            </Card>
            <Card title="Postmortem">
              For any Sev-1, we publish a written postmortem to affected
              customers within 5 business days. Format: what happened,
              what triggered it, what we&apos;ve done, what we&apos;re
              doing to prevent recurrence. No blame, all facts.
            </Card>
          </Section>

          {/* ─── What we're not yet ────────────────────────── */}
          <Section eyebrow="07 · Honest about what's not in place" title="What we don't claim today">
            <Card title="Not SOC 2 certified yet">
              Type II is on the R3 roadmap. We ship the audit log + access
              control prerequisites today, but the formal annual audit
              hasn&apos;t happened. Customers who require SOC 2 today should
              either wait for R3 or look at the on-prem SKU (the audit
              shifts to the customer&apos;s own infrastructure).
            </Card>
            <Card title="No regular external pen test yet">
              We rely on automated dep scanning (Dependabot, npm audit)
              and code review. A scheduled external pen test program
              starts when we cross 100 customers or close our first
              Enterprise / Government deal — whichever first.
            </Card>
            <Card title="No formal status page yet">
              Outages are communicated by email. A public status page is
              R2.
            </Card>
            <Card title="MFA is on the roadmap">
              Multi-factor authentication for Building Manager accounts is
              planned; mandatory MFA for BM accounts ships in R2.
            </Card>
          </Section>

          {/* ─── Contact ───────────────────────────────────── */}
          <Section eyebrow="08 · Contact" title="Security questions or disclosure">
            <Card title="Reporting a vulnerability">
              Email <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">info@buildingsync.app</a>
              {" "}with &quot;Security&quot; in the subject. We acknowledge within
              one business day. Coordinated disclosure preferred — give us
              90 days before public disclosure unless a customer is
              actively at risk.
            </Card>
            <Card title="Vendor questionnaires">
              We return standard procurement security questionnaires (SIG,
              CAIQ-lite, custom) within 5 business days for Enterprise
              prospects. Smaller customers get a one-page summary on
              request.
            </Card>
          </Section>

          <div className="rounded-lg border border-border bg-muted/20 p-5">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
              Not the full picture
            </p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              This page covers operational and architectural posture.
              For legal / regulatory compliance per jurisdiction, see{" "}
              <Link href="/legal" className="text-accent hover:underline">Legal &amp; compliance</Link>.
              For privacy specifics see{" "}
              <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">{eyebrow}</p>
      <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}
