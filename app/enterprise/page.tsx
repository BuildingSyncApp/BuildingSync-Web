import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/ui";

// Lead-capture page for Enterprise + Government inquiries. The two
// audiences share most of the answer (dedicated tenancy, residency,
// SSO, custom procurement) but Government has additional binding
// requirements (AODA, bilingual, ITSG-33). The ?gov=1 query param
// flips the page into Government framing.

export const metadata: Metadata = {
  title: "Enterprise & Government — BuildingSync",
  description:
    "Dedicated cloud, custom data residency, SSO, accessibility (AODA / WCAG 2.1 AA), bilingual UI, and procurement-friendly contracting for REITs, large condo corps, and Canadian municipal / provincial / federal customers.",
};

const ENTERPRISE_BLOCKS = [
  {
    title: "Dedicated cloud, your choice of region",
    body: "Your buildings get their own Supabase project + Vercel deployment. Same code, isolated infrastructure, no shared database with other customers. Choose Canada (ca-central, Toronto) by default; we support US, EU, and other regions on request.",
  },
  {
    title: "Identity that fits your stack",
    body: "Single sign-on via SAML, OIDC, or your existing identity provider (Okta, Azure AD, Google Workspace). SCIM provisioning for managed user lifecycle. MFA mandatory across the surface.",
  },
  {
    title: "Built-in evidence",
    body: "Append-only audit log over every interaction. Downloadable communications log (CSV) per building, per date window — usable directly for LTB / RTA hearings, insurance investigations, and internal review. Per-user data export and soft-archive deletion (PIPEDA Art. 4.5 + GDPR Art. 20).",
  },
  {
    title: "Compliance on the roadmap, transparently",
    body: "We are PIPEDA + Loi 25 aware today. SOC 2 Type II is on the roadmap; we ship the audit-grade event log + access-control infrastructure first. Procurement-grade vendor questionnaires returned within 5 business days.",
  },
];

const GOV_BLOCKS = [
  {
    title: "Canadian-only data residency",
    body: "Your buildings deploy to Supabase ca-central (Toronto). Database, file storage, and audit logs never leave Canada. Documented in your data-processing agreement.",
  },
  {
    title: "Bilingual UI (English + French)",
    body: "French (Canada) UI ships ahead of any federal or QC customer onboarding. Switcher mechanism is wired today; full translation lands in R2. We commit translations are part of your statement of work, not an upsell.",
  },
  {
    title: "Accessibility — AODA + WCAG 2.1 AA",
    body: "Three-mode contrast (Paper / Light / Dark), all meeting AA contrast ratios. Keyboard-navigable surface. Screen-reader labels on every actionable element. Reduced-motion respected. VAPT + accessibility audit available on request as part of procurement.",
  },
  {
    title: "Procurement-friendly contracting",
    body: "RFI / RFP responses on standard turnaround. Custom SOWs. Background-cleared support staff per CCCS posture. ITSG-33 control alignment documented in our security questionnaire.",
  },
  {
    title: "Sovereignty + audit",
    body: "Per-tenant database, per-tenant encryption keys (BYOK on request). Comprehensive audit log over every state change with actor, IP, user-agent, and structured change diff. Exportable on demand for compliance review.",
  },
];

const FAQS = [
  {
    q: "How long does an Enterprise / Government deployment take?",
    a: "First call to live: typically 30 days for Enterprise (provision dedicated infra, configure SSO, import portfolios) and 60–90 days for Government (procurement gates, security review, accessibility audit, SOW negotiation). We're transparent about timelines from the first call.",
  },
  {
    q: "Can we host BuildingSync on our own cloud (BYOC)?",
    a: "Yes — for very large customers with their own IT capacity. The architectural hook is in place via signed enterprise license keys. We will not pretend BYOC is push-button today; it's a real engineering engagement and we'll only do it where the contract justifies the work. Talk to us.",
  },
  {
    q: "Do you support multi-portfolio / multi-property-management firms?",
    a: "Yes. Property management firms operating multiple buildings get a single tenancy with portfolio-level views and per-building isolation. Pricing is per-unit-per-month with portfolio volume discounts.",
  },
  {
    q: "What about pricing for Government?",
    a: "Government pricing is custom and tied to your SOW. Typical structure: per-unit per-month with a fixed annual platform fee covering Canadian residency, dedicated tenancy, bilingual UI, accessibility commitments, and named support. We're happy to share reference pricing on the first call.",
  },
  {
    q: "Do you have SOC 2 today?",
    a: "Not yet. We are honest about this — we're in MVP through R2 and SOC 2 Type II is on the R3 roadmap. We have shipped the prerequisites (audit log, access control, encryption-at-rest, secrets management). For customers requiring SOC 2 today, we recommend waiting until R3 or scoping a pilot that doesn't gate on it.",
  },
];

export default async function EnterprisePage({
  searchParams,
}: {
  searchParams?: Promise<{ gov?: string }>;
}) {
  const params = (await searchParams) || {};
  const isGov = params.gov === "1";

  const blocks = isGov ? GOV_BLOCKS : ENTERPRISE_BLOCKS;
  const audience = isGov ? "Government" : "Enterprise";
  const subjectPrefix = isGov ? "Government inquiry" : "Enterprise inquiry";
  const headline = isGov
    ? "BuildingSync for Canadian government."
    : "BuildingSync for enterprise.";
  const sub = isGov
    ? "For municipal, provincial, federal, and Crown corporation housing portfolios. Canadian residency, AODA + WCAG 2.1 AA, bilingual UI, procurement-friendly."
    : "For REITs, large condo corporations, and multi-property operators. Dedicated cloud, custom residency, SSO, named support.";

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/40 bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center" aria-label="BuildingSync home">
            <Wordmark className="text-base md:text-lg" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={isGov ? "/enterprise" : "/enterprise?gov=1"}
              className="hidden sm:inline-flex items-center px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted transition-colors"
            >
              {isGov ? "See Enterprise" : "See Government"}
            </Link>
            <a
              href={`mailto:info@buildingsync.app?subject=${encodeURIComponent(subjectPrefix)}`}
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors"
            >
              Email sales
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">{audience}</p>
        <h1
          className="mt-4 tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
        >
          {headline}
        </h1>
        <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
          {sub}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <a
            href={`mailto:info@buildingsync.app?subject=${encodeURIComponent(subjectPrefix)}&body=${encodeURIComponent(`Hi BuildingSync,\n\nI'd like to talk about a ${audience.toLowerCase()} deployment.\n\nOrganisation:\nPortfolio size (buildings + units):\nKey requirements:\nProcurement timeline:\nBest times for a 30-min call:\n\nThanks.`)}`}
            className="inline-flex items-center justify-center px-5 py-3 rounded-md bg-accent text-accent-foreground text-base font-semibold hover:bg-accent/90 transition-colors"
          >
            Start a {audience.toLowerCase()} conversation
          </a>
          <Link
            href="/walkthrough"
            className="inline-flex items-center justify-center px-5 py-3 rounded-md border border-border hover:bg-muted text-base font-semibold transition-colors"
          >
            Or book a 30-min walkthrough
          </Link>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Founder responds personally within one business day. We don&apos;t hand{" "}
          {audience.toLowerCase()} conversations to junior reps.
        </p>

        <section className="mt-16 md:mt-20">
          <h2 className="text-xl font-semibold tracking-tight">
            What changes vs. the standard product
          </h2>
          <div className="mt-6 space-y-4">
            {blocks.map((b) => (
              <div key={b.title} className="bg-card border border-border rounded-md p-5">
                <h3 className="font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 md:mt-20">
          <h2 className="text-xl font-semibold tracking-tight">Common questions</h2>
          <ul className="mt-6 space-y-5">
            {FAQS.map((f) => (
              <li key={f.q} className="border-l-2 border-accent/40 pl-4">
                <p className="font-semibold">{f.q}</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16 md:mt-20 bg-accent/10 border border-accent/40 rounded-xl p-6 md:p-8">
          <h2 className="text-xl font-semibold tracking-tight">
            What we&apos;ll need from you on the first call
          </h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed">
            <li>• Portfolio size — buildings, total units, geographic spread</li>
            <li>• Hard requirements — residency, SSO provider, accessibility, language</li>
            <li>• Procurement timeline + decision-makers</li>
            <li>• Existing tools you&apos;d be replacing or integrating with</li>
            {isGov && (
              <>
                <li>• Procurement vehicle (direct, GC standing offer, vendor of record list)</li>
                <li>• Security clearance requirements for support staff</li>
              </>
            )}
          </ul>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href={`mailto:info@buildingsync.app?subject=${encodeURIComponent(subjectPrefix)}`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors text-sm"
            >
              Email us
            </a>
            <Link
              href="/walkthrough"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors text-sm"
            >
              Book a walkthrough
            </Link>
            <Link
              href="/press"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors text-sm"
            >
              Press kit
            </Link>
          </div>
        </section>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          BuildingSync is a Node2.io service. Headquartered in Canada, development centre in India.{" "}
          <Link href="/about" className="text-accent hover:underline">
            More about us
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
