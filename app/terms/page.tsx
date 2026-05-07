import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/ui";

export const metadata: Metadata = {
  title: "Terms of Service — BuildingSync",
  description: "Terms governing use of BuildingSync — eligibility, acceptable use, payments, liability, and dispute resolution under Ontario law.",
};

const LAST_UPDATED = "May 2026";

export default function TermsPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-background/85 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" aria-label="BuildingSync home"><Wordmark className="text-base" /></Link>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Trust</p>
        <h1
          className="mt-3 tracking-tight"
          style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2.25rem, 5vw, 3.5rem)" }}
        >
          TERMS OF SERVICE
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        <p className="mt-2 text-xs text-muted-foreground italic">
          This is a starting scaffold, not a substitute for legal review. Have a Canadian SaaS lawyer review before relying on it for a paid relationship.
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/90">
          <Section title="1. Who you're contracting with">
            <p>BuildingSync is operated by <strong>Node2.io</strong> (&quot;BuildingSync&quot;, &quot;we&quot;, &quot;us&quot;). By creating an account or otherwise using the service, you (&quot;you&quot;, &quot;Customer&quot;) agree to these Terms. If you&apos;re signing up on behalf of an organization (a property management company, building owner, etc.), you confirm you have authority to bind that organization.</p>
          </Section>

          <Section title="2. Eligibility & accounts">
            <p>You must be at least 18 and able to enter a binding contract under Ontario law. You&apos;re responsible for activity under your account; keep your credentials secure. Notify us at <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">info@buildingsync.app</a> if you suspect compromise.</p>
            <p className="mt-3">Building staff and platform-admin accounts (Building Manager, Facility Manager, Concierge, BuildingSync staff) may be required to enable two-factor authentication once we ship it.</p>
          </Section>

          <Section title="3. The service">
            <p>BuildingSync provides software-as-a-service for property management — resident/tenant portals, maintenance request tracking, announcements, and related operational tooling. The exact feature set depends on your plan (see <Link href="/#pricing" className="text-accent hover:underline">Pricing</Link>) and may evolve over time.</p>
            <p className="mt-3">The service is provided &quot;as is&quot; during R1 (early production). Specific features may be added, removed, or changed; we&apos;ll communicate material changes by email or in-product notice with reasonable lead time.</p>
          </Section>

          <Section title="4. Acceptable use">
            <p>You agree not to:</p>
            <ul className="mt-3 space-y-1.5 list-disc pl-5">
              <li>use the service to violate any law, including the Ontario <em>Residential Tenancies Act</em>, <em>Human Rights Code</em>, <em>PIPEDA</em>, or anti-spam law (CASL);</li>
              <li>collect or store sensitive categories of personal information (health, financial, biometric) beyond what BuildingSync explicitly supports;</li>
              <li>use the service to harass, threaten, or discriminate against any tenant, resident, or staff member;</li>
              <li>reverse-engineer, scrape, or attempt unauthorized access to BuildingSync systems or other customers&apos; data;</li>
              <li>resell or sublicense the service without a written reseller agreement.</li>
            </ul>
          </Section>

          <Section title="5. Payments & subscriptions">
            <p>Paid plans bill monthly per unit at the rates published on the <Link href="/#pricing" className="text-accent hover:underline">Pricing</Link> page at the time of subscription. We may change pricing for new subscribers; existing subscribers get at least 30 days&apos; notice before any price change to their plan.</p>
            <p className="mt-3">Subscriptions renew automatically until cancelled. Cancellations take effect at the end of the current billing period. Fees already paid are non-refundable except where required by law.</p>
            <p className="mt-3">When the rent-payment feature is available, BuildingSync acts (depending on the configuration) either as a payment facilitator (the landlord is the merchant of record) or as the merchant — see your applicable rent-payment addendum. Stripe processing fees on rent are absorbed by the property manager and are not charged to tenants, in compliance with Ontario <em>RTA</em> s. 134.</p>
          </Section>

          <Section title="6. Customer data">
            <p>You retain all rights in the data you submit to BuildingSync (resident records, maintenance entries, announcements, etc.). You grant us a limited license to use that data solely to operate the service for you. We don&apos;t use your data to train AI models, sell it to third parties, or aggregate it across customers.</p>
            <p className="mt-3">Our handling of personal information is described in the <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>, which forms part of these Terms.</p>
          </Section>

          <Section title="7. Confidentiality">
            <p>Each party will protect the other&apos;s confidential information with reasonable care and use it only to perform under this agreement. Confidential information doesn&apos;t include information that is or becomes public through no fault of the receiving party.</p>
          </Section>

          <Section title="8. Service levels & support">
            <p>We aim for reasonable uptime and respond to support requests at <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">info@buildingsync.app</a> within one business day during R1. Formal SLAs and credits are not part of R1; once published, they&apos;ll apply to all paid plans.</p>
          </Section>

          <Section title="9. Warranty disclaimer">
            <p>EXCEPT AS EXPRESSLY STATED IN THESE TERMS, THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;. WE DISCLAIM ALL OTHER WARRANTIES — IMPLIED, STATUTORY, OR OTHERWISE — INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY LAW.</p>
          </Section>

          <Section title="10. Limitation of liability">
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, BUILDINGSYNC&apos;S TOTAL AGGREGATE LIABILITY ARISING FROM OR RELATING TO THESE TERMS IS LIMITED TO THE AMOUNTS YOU PAID US IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO LIABILITY. NEITHER PARTY IS LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR EXEMPLARY DAMAGES (INCLUDING LOST PROFITS).</p>
            <p className="mt-3">Nothing in these Terms limits liability for: (a) gross negligence or wilful misconduct; (b) breach of confidentiality obligations; or (c) any liability that cannot be excluded under applicable law.</p>
          </Section>

          <Section title="11. Indemnification">
            <p>You will defend and indemnify BuildingSync against third-party claims arising from your use of the service in violation of these Terms or applicable law (including landlord-tenant disputes, employment matters, or human-rights complaints involving your tenants or staff). BuildingSync will defend and indemnify you against third-party claims that the service, as provided by us, infringes that third party&apos;s Canadian intellectual-property rights.</p>
          </Section>

          <Section title="12. Term & termination">
            <p>These Terms apply as long as you have an account. Either party may terminate with 30 days&apos; written notice. We may suspend or terminate immediately for: non-payment, breach of acceptable use, or a court order. On termination, you have 30 days to export your data; after that, we delete it.</p>
          </Section>

          <Section title="13. Governing law & disputes">
            <p>These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable in Ontario, without regard to conflict-of-law rules. Disputes will be resolved in the courts of Toronto, Ontario, except that either party may seek injunctive relief in any court of competent jurisdiction.</p>
          </Section>

          <Section title="14. Changes to these Terms">
            <p>We may update these Terms from time to time. Material changes will be communicated by email or in-product notice at least 14 days before they take effect. Continued use of the service after the effective date constitutes acceptance of the updated Terms.</p>
          </Section>

          <Section title="15. Contact">
            <p>Questions or notices: <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">info@buildingsync.app</a>.</p>
          </Section>
        </div>
      </main>

      <footer className="max-w-3xl mx-auto px-6 py-8 border-t border-border mt-12">
        <p className="text-xs text-muted-foreground font-mono">
          © {new Date().getFullYear()} BuildingSync · <Link href="/" className="hover:text-foreground transition-colors">Home</Link> · <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        </p>
      </footer>
    </div>
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
