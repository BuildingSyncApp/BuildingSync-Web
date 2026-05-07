import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "Privacy Policy — BuildingSync",
  description: "How BuildingSync handles your data: row-level isolation by building, no third-party tracking, export and delete on demand.",
};

const LAST_UPDATED = "May 2026";
// Privacy Officer designation — required under PIPEDA. Update with the
// actual designated officer's name when finalized; the email below is
// monitored by Node2.io's privacy team.
const PRIVACY_OFFICER_NAME = "Node2.io Privacy Office";
const PRIVACY_OFFICER_EMAIL = "info@buildingsync.app";

export default function PrivacyPage() {
  return (
    <AuthShell back={{ href: "/", label: "Home" }} width="wide">
      <div className="py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Trust</p>
        <h1
          className="mt-3 tracking-tight"
          style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2.25rem, 5vw, 3.5rem)" }}
        >
          PRIVACY POLICY
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/90">
          <Section title="1. What we collect">
            <p>To run your building on BuildingSync we store:</p>
            <ul className="mt-3 space-y-1.5 list-disc pl-5">
              <li>Your sign-in email and an opaque user ID issued by Supabase Auth.</li>
              <li>Profile data you choose to add — display name and phone.</li>
              <li>Your role assignment (resident, tenant, concierge, facility manager, building manager, or platform admin) and the building / unit you&apos;re linked to.</li>
              <li>Records you create through the app: maintenance requests, announcements, comments.</li>
              <li>Standard server logs (IP, user-agent, timestamps) used for security and debugging.</li>
            </ul>
            <p className="mt-3">We do not collect device location, contacts, microphone or camera data, biometrics, or any third-party advertising identifiers.</p>
          </Section>

          <Section title="2. What we do with it">
            <p>Your data is used solely to operate the service: render your dashboard, route a maintenance request to the right building&apos;s staff, deliver announcements, send transactional email (e.g. welcome email, work-order status change). We do not use your data to train AI models, sell to third parties, or build cross-customer analytics.</p>
          </Section>

          <Section title="3. Per-building isolation">
            <p>Every record is scoped to a <code className="font-mono text-xs">buildingId</code>. Queries filter by your assigned building before returning rows; data from other buildings is never visible to you. Platform administrators (BuildingSync staff) have access to operational metadata only when needed to support a customer issue.</p>
          </Section>

          <Section title="4. Email">
            <p>Transactional emails (sign-in welcome, work-order updates, announcement broadcasts) are sent through <a href="https://resend.com" rel="noopener" className="text-accent hover:underline">Resend</a>. Resend processes the recipient address and message body to deliver the email; no other personal data is sent. We don&apos;t send marketing email without explicit opt-in.</p>
          </Section>

          <Section title="5. Cookies & tracking">
            <p>BuildingSync uses one essential cookie — your Supabase Auth session token — set on the <code className="font-mono text-xs">.buildingsync.app</code> domain. It&apos;s required to keep you signed in. We don&apos;t run analytics, advertising pixels, session recording, or any third-party trackers.</p>
          </Section>

          <Section title="6. Storage, retention & cross-border processing">
            <p>
              Your data is stored in <strong>Supabase</strong> (PostgreSQL) hosted on{" "}
              <strong>Amazon Web Services</strong>. The current production region is{" "}
              <code className="font-mono text-xs">us-west-2</code> (Oregon, USA). Customers
              with Canadian data-residency requirements (e.g. Quebec residents subject to
              <em> Loi 25</em>, federal-government contracts) should contact us before
              onboarding — we are migrating institutional buildings to Supabase&apos;s{" "}
              <code className="font-mono text-xs">ca-central-1</code> region (Montréal) on request.
            </p>
            <p className="mt-3">
              <strong>Cross-border access by service providers.</strong> BuildingSync is operated by Node2.io, which has development and operations staff in <strong>Canada</strong> (head office) and <strong>India</strong> (engineering and on-call support). India-based personnel may access production systems for engineering, debugging, and customer-support purposes under access controls and contractual confidentiality obligations. By using BuildingSync you consent to this cross-border processing under <em>PIPEDA</em> (Personal Information Protection and Electronic Documents Act) and, where applicable, <em>Loi 25</em>.
            </p>
            <p className="mt-3">
              Other service providers we share necessary data with: <a href="https://resend.com" rel="noopener" className="text-accent hover:underline">Resend</a> (transactional email; sends from servers in the EU/US), <a href="https://stripe.com" rel="noopener" className="text-accent hover:underline">Stripe</a> (payments, when enabled), <a href="https://vercel.com" rel="noopener" className="text-accent hover:underline">Vercel</a> (application hosting; edge network is global). All sub-processors are bound by data-processing terms equivalent to or stronger than this policy.
            </p>
            <p className="mt-3">
              <strong>Retention.</strong> While your subscription is active, records persist as long as you keep your account or until you delete them. After cancellation, your building&apos;s records remain available for 30 days for export, then are permanently deleted. Audit-log entries (who took what action when) are retained for up to <strong>7 years</strong> to satisfy potential Landlord and Tenant Board / Régie du logement evidence requests, even after the underlying records are deleted.
            </p>
          </Section>

          <Section title="7. Your rights — access, correction, export, delete">
            <p>Under <em>PIPEDA</em>, <em>Loi 25</em> (Quebec residents), and equivalent provincial privacy acts, you have the right to:</p>
            <ul className="mt-3 space-y-1.5 list-disc pl-5">
              <li><strong>Access</strong> the personal information we hold about you — request a JSON export by emailing the privacy contact below.</li>
              <li><strong>Correct</strong> inaccurate information — update your profile + password directly at <Link href="/dashboard/account" className="text-accent hover:underline">/dashboard/account</Link> (or <Link href="/team/account" className="text-accent hover:underline">/team/account</Link> for staff), or email us for changes you can&apos;t make in-product.</li>
              <li><strong>Withdraw consent</strong> for any optional processing (e.g. marketing email, future analytics) without affecting the operation of the service.</li>
              <li><strong>Delete</strong> your account and associated records.</li>
              <li><strong>Receive a copy</strong> in a structured, commonly-used, machine-readable format (data portability).</li>
              <li><strong>Complain</strong> to a regulator: the federal Office of the Privacy Commissioner of Canada (priv.gc.ca), or your provincial regulator (e.g. Quebec&apos;s Commission d&apos;accès à l&apos;information, BC&apos;s OIPC, Alberta&apos;s OIPC).</li>
            </ul>
            <p className="mt-3">We respond to verified requests within 30 days. If you&apos;re in the EU/UK, these rights also satisfy GDPR Articles 15, 16, 17, 18, and 20.</p>
          </Section>

          <Section title="8. Payments (when enabled)">
            <p>Card data for rent payments or subscription billing is handled directly by <a href="https://stripe.com" rel="noopener" className="text-accent hover:underline">Stripe</a> — BuildingSync never sees full card numbers. Only Stripe customer/subscription IDs are stored on our side. Stripe processing fees on rent are absorbed by the property manager and never charged to tenants, in compliance with Ontario Residential Tenancies Act s. 134.</p>
          </Section>

          <Section title="9. Security incidents & breach notification">
            <p>
              We follow industry-standard practices for protecting your data: encrypted-at-rest storage, TLS for all in-transit traffic, principle-of-least-privilege access for staff, and audit logging of privileged actions.
            </p>
            <p className="mt-3">
              In the event of a security breach involving personal information that creates a real risk of significant harm to affected individuals, we will:
            </p>
            <ul className="mt-3 space-y-1.5 list-disc pl-5">
              <li>Notify the federal Office of the Privacy Commissioner of Canada under <em>PIPEDA</em> within the prescribed timeframe.</li>
              <li>Notify Quebec&apos;s Commission d&apos;accès à l&apos;information under <em>Loi 25</em> for affected QC residents.</li>
              <li>Notify affected users by email as soon as practicable.</li>
              <li>Maintain a breach record for at least 24 months as required by federal regulation.</li>
            </ul>
            <p className="mt-3">
              To report a suspected security issue, email{" "}
              <a href="mailto:security@buildingsync.app" className="text-accent hover:underline">security@buildingsync.app</a>{" "}
              or see <a href="/.well-known/security.txt" className="text-accent hover:underline">/.well-known/security.txt</a>.
            </p>
          </Section>

          <Section title="10. Children">
            <p>BuildingSync is not directed at children under 13. We do not knowingly collect personal information from children. If a parent or guardian believes their child has provided us with personal information, contact the privacy officer below and we will delete it.</p>
          </Section>

          <Section title="11. Changes to this policy">
            <p>If we make material changes (anything that meaningfully expands what we collect or how we use it), we&apos;ll notify all account holders by email at least 14 days before the change takes effect. The current version is always at <Link href="/privacy" className="text-accent hover:underline">/privacy</Link> with the &quot;last updated&quot; date at the top.</p>
          </Section>

          <Section title="12. Privacy Officer & contact">
            <p>
              BuildingSync&apos;s designated Privacy Officer (as required by <em>PIPEDA</em> s. 4.1.4) is reachable at:
            </p>
            <div className="mt-3 bg-card border border-border rounded-md p-4 font-mono text-sm space-y-1">
              <p>{PRIVACY_OFFICER_NAME}</p>
              <p>
                <a href={`mailto:${PRIVACY_OFFICER_EMAIL}`} className="text-accent hover:underline">{PRIVACY_OFFICER_EMAIL}</a>
              </p>
              <p className="text-xs text-muted-foreground mt-2">Subject line: &quot;Privacy request — [your topic]&quot;</p>
            </div>
            <p className="mt-3">
              For privacy-specific issues we respond within 30 days. For general support email{" "}
              <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">info@buildingsync.app</a>.
            </p>
          </Section>
        </div>
      </div>
    </AuthShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 text-muted-foreground">{children}</div>
    </section>
  );
}
