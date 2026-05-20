import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";

// Public stance on integrations. Designed to serve two audiences on
// one page:
//   1. Customers asking "does BuildingSync work with X?"
//   2. Vendors asking "can we integrate with BuildingSync?"
//
// The answer to both is the same: any public API can be integrated;
// vendors who want to partner just need to email.

export const metadata: Metadata = {
  title: "Integrations — BuildingSync",
  description:
    "How BuildingSync connects with other tools. Open API stance, common integrations by category, and how to partner if you're a vendor.",
};

const CATEGORIES: Array<{ title: string; blurb: string; examples: string[] }> = [
  {
    title: "Smart locks &amp; door access",
    blurb: "Self-serve resident codes, BM provisioning, lock-state audit log.",
    examples: ["Latch", "PointCentral", "Salto KS", "Yale Access", "August", "Schlage Encode", "Brivo", "Igloohome"],
  },
  {
    title: "Sensors &amp; safety",
    blurb: "Leak detection, smoke / CO, occupancy, indoor air quality.",
    examples: ["Notion", "Vivint", "SimpliSafe", "Awair", "Airthings"],
  },
  {
    title: "HVAC &amp; thermostats",
    blurb: "Centralised temperature control, energy reporting.",
    examples: ["Nest", "Ecobee", "Honeywell Home", "Mysa"],
  },
  {
    title: "Energy &amp; utilities",
    blurb: "Per-unit consumption data, submetering, bill-back support.",
    examples: ["Sense", "Emporia Vue", "Quadlogic", "GENABILITY"],
  },
  {
    title: "Payment &amp; accounting",
    blurb: "Rent collection, ledger sync, expense tracking.",
    examples: ["Stripe", "QuickBooks Online", "Xero", "Plaid"],
  },
  {
    title: "Communication",
    blurb: "Transactional email, SMS, calendaring.",
    examples: ["Resend", "Twilio", "Postmark", "Google / Microsoft 365"],
  },
  {
    title: "Identity &amp; SSO",
    blurb: "Enterprise + government single sign-on.",
    examples: ["Okta", "Azure AD / Entra", "Google Workspace", "Keycloak"],
  },
  {
    title: "Building Automation Systems",
    blurb: "Older commercial buildings via on-prem gateway.",
    examples: ["BACnet (via gateway)", "Modbus (via gateway)", "KNX (via gateway)"],
  },
];

export default function IntegrationsPage() {
  return (
    <AuthShell back={{ href: "/", label: "Home" }} width="wide">
      <div className="py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Integrations</p>
        <h1
          className="mt-3 tracking-tight"
          style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2.25rem, 5vw, 3.5rem)" }}
        >
          WIRE IT UP
        </h1>
        <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
          BuildingSync is open by design. Anything with a public API
          can be wired in. Anything that can&apos;t — usually because
          there&apos;s no public API — is a conversation, not a no.
        </p>

        {/* ─── The headline stance ────────────────────────── */}
        <section className="mt-10 grid md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">For customers</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              &ldquo;Does it work with X?&rdquo;
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              If X has a public REST / GraphQL / webhooks API, the answer
              is <strong className="text-foreground">yes</strong>. Tell us
              which one, how many doors / units / sensors, and your timeline
              — we&apos;ll scope it. Common integrations below; the list
              isn&apos;t exhaustive.
            </p>
            <a
              href="mailto:info@buildingsync.app?subject=Integration%20request"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              Tell us what to integrate →
            </a>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">For vendors</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              &ldquo;Can we connect to BuildingSync?&rdquo;
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Yes. No formal partner-program tier to qualify for — just
              email us with what you do, who your customers are, and where
              the integration would fit. We respond personally, usually
              within one business day.
            </p>
            <a
              href="mailto:info@buildingsync.app?subject=Vendor%20partnership%20enquiry"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              Start a vendor conversation →
            </a>
          </div>
        </section>

        {/* ─── Common categories ──────────────────────────── */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">Common integration categories</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            What customers most often ask about. Specific vendors are
            example names, not endorsements — if yours isn&apos;t listed,
            tell us and we&apos;ll add it. Some require a customer to
            also have an account with the vendor; others work with just
            the vendor&apos;s public API.
          </p>
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <article key={c.title} className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-semibold text-foreground" dangerouslySetInnerHTML={{ __html: c.title }} />
                <p className="mt-1.5 text-xs text-muted-foreground">{c.blurb}</p>
                <p className="mt-3 text-xs font-mono text-foreground/80 leading-relaxed">
                  {c.examples.join(" · ")}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── How it works under the hood ────────────────── */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">How it works under the hood</h2>
          <div className="mt-6 space-y-4">
            <Card title="Cloud SKU">
              Direct cloud-to-cloud — we call vendor APIs over the public
              internet using OAuth or API keys. Webhooks from vendors land
              at <code className="font-mono text-xs">/api/webhooks/[vendor]</code> for real-time events.
              Most modern smart locks, sensors, payment processors, and
              SaaS tools integrate this way.
            </Card>
            <Card title="On-premise SKU">
              Air-gapped, so vendor-cloud APIs are unreachable. Integration
              happens via local gateways on the building&apos;s LAN —
              MQTT broker for sensors, BACnet / Modbus bridge for older
              commercial systems, on-prem controllers for enterprise lock
              systems (Salto on-prem, dormakaba). See{" "}
              <Link href="/enterprise" className="text-accent hover:underline">Enterprise &amp; Government</Link>.
            </Card>
            <Card title="OpenAPI specification">
              For developers building on top of BuildingSync, the full HTTP
              API is published at{" "}
              <Link href="/developers" className="text-accent hover:underline">/developers</Link> with
              generated TypeScript / Swift / Kotlin client libraries. Auth
              is Bearer JWT via the standard Supabase Auth SDK.
            </Card>
          </div>
        </section>

        {/* ─── Realistic scope expectations ───────────────── */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">What to expect on timeline</h2>
          <div className="mt-6 space-y-3 text-sm leading-relaxed text-foreground/90">
            <p>
              <strong>Vendor with clean public API + active customer demand:</strong>{" "}
              1–2 weeks from kickoff to a working pilot integration.
            </p>
            <p>
              <strong>Vendor with API but quirks (auth flow, rate limits, undocumented edges):</strong>{" "}
              3–4 weeks.
            </p>
            <p>
              <strong>Vendor with API behind a partner agreement:</strong>{" "}
              4–8 weeks (timeline dominated by their legal, not our engineering).
            </p>
            <p>
              <strong>Vendor with no public API:</strong>{" "}
              We can&apos;t scope until we talk to them. If they&apos;re
              willing to expose an API for the integration, we&apos;ll
              build alongside their work.
            </p>
          </div>
        </section>

        {/* ─── CTA ────────────────────────────────────────── */}
        <section className="mt-14 bg-accent/10 border border-accent/40 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Open by design</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            BuildingSync is positioned as a hub, not a walled garden.
            Whether you&apos;re a buyer asking if your existing tools
            work, or a vendor wanting to be in the customer&apos;s
            day-to-day flow — the door&apos;s open.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="mailto:info@buildingsync.app?subject=Integration%20request"
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              Email us
            </a>
            <Link
              href="/developers"
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold border border-border bg-card hover:bg-muted transition-colors"
            >
              Developer docs
            </Link>
          </div>
        </section>
      </div>
    </AuthShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
