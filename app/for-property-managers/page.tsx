import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/ui";

// Single-URL pitch — designed to be sent as a link to a cold prospect
// and scanned in 60 seconds. Above the fold answers: what is it, who
// for, what's the offer, what do I do. Everything below is supporting
// detail. No carousel, no animation, no sales-deck cliches.

export const metadata: Metadata = {
  title: "BuildingSync for property managers — replace 5 tools, free 90 days",
  description:
    "BuildingSync is the operations platform Building Managers run their day on. Incidents, maintenance, communications, deliveries, legal notices. Free 90-day pilot for the first 5 buildings. $2.50/unit/month after.",
};

export default function ForPropertyManagersPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/40 bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center" aria-label="BuildingSync home">
            <Wordmark className="text-base md:text-lg" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors"
          >
            Start a free pilot
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-16">
        {/* Above the fold — answers what / who / why / now */}
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
            For Building Managers · Property Managers · Concierge teams
          </p>
          <h1
            className="mt-4 tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
          >
            Stop running your building<br />from inboxes and spreadsheets.
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            BuildingSync replaces 5 tools — work-order email threads, announcement WhatsApp groups, package log spreadsheets, incident notebooks, and lease-notice Word docs — with one platform. Built for residential buildings in Ontario / Canada.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-5 py-3 rounded-md bg-accent text-accent-foreground text-base font-semibold hover:bg-accent/90 transition-colors"
            >
              Start a free 90-day pilot →
            </Link>
            <Link
              href="/walkthrough"
              className="inline-flex items-center justify-center px-5 py-3 rounded-md border border-border hover:bg-muted text-base font-semibold transition-colors"
            >
              Or book a 15-min walkthrough
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Pilot terms:</strong> free for the first 5 residential buildings, no credit card, white-glove setup. After 90 days: $2.50 / unit / month or cancel — your call.
          </p>
        </section>

        {/* Five things you stop doing */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-xl font-semibold tracking-tight">What you stop doing on day one</h2>
          <ul className="mt-6 space-y-4">
            {STOP_DOING.map((item) => (
              <li key={item.title} className="flex gap-4 items-start">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground shrink-0 w-16 pt-0.5">
                  {item.tag}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Module callouts */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-xl font-semibold tracking-tight">What&apos;s in the box</h2>
          <p className="mt-2 text-sm text-muted-foreground">Live today, not screenshots from the future.</p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULES.map((m) => (
              <div key={m.title} className="bg-card border border-border rounded-md p-5">
                <p className="font-semibold">{m.title}</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Compliance + trust */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-xl font-semibold tracking-tight">Built for Canadian residential buildings</h2>
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <li>
              <strong className="text-foreground">PIPEDA + Loi 25 aware.</strong> Privacy-first by design. Per-building data isolation. Downloadable data exports for users on demand.
            </li>
            <li>
              <strong className="text-foreground">LTB / RTA paper trail.</strong> Append-only audit log over every channel. Communications log download (CSV) you can hand directly to counsel for a hearing or insurance claim.
            </li>
            <li>
              <strong className="text-foreground">RTA s. 134 compliant rent flow.</strong> When rent payments ship (Stripe is wired, awaiting compliance review), processing fees are absorbed by the property manager — never charged to tenants.
            </li>
            <li>
              <strong className="text-foreground">Ontario RTA notice templates.</strong> N4 / N5 / N12 prefilled with your tenant + lease info, served-date tracking, printable PDF. (Tribunal filings still need the official form from tribunalsontario.ca — we make the prep faster.)
            </li>
          </ul>
          <p className="mt-6 text-sm">
            <Link href="/legal" className="text-accent hover:underline font-medium">
              Read the full legal &amp; compliance summary →
            </Link>
          </p>
        </section>

        {/* Integration stance — open by design */}
        <section className="mt-16 md:mt-20 bg-card border border-border rounded-xl p-6 md:p-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Integrations
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Works with everything that has a public API
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Smart locks, sensors, HVAC, energy meters, accounting tools — if
            it has a public API, we can wire it in. If your vendor isn&apos;t
            on our list yet, tell us and we&apos;ll scope it. Vendors looking
            to integrate with BuildingSync just need to email — no formal
            partner-program tier to qualify for.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/integrations"
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              Common integrations →
            </Link>
            <a
              href="mailto:info@buildingsync.app?subject=Integration%20request"
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold border border-border hover:bg-muted transition-colors"
            >
              Tell us what to integrate
            </a>
          </div>
        </section>

        {/* Pricing summary */}
        <section className="mt-16 md:mt-20 bg-accent/10 border border-accent/40 rounded-xl p-6 md:p-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Plain-language pricing</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">$0</p>
              <p className="mt-1 text-muted-foreground">First 90 days, first 5 buildings.</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">$2.50</p>
              <p className="mt-1 text-muted-foreground">Per unit, per month — Essential. After pilot.</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">No catch</p>
              <p className="mt-1 text-muted-foreground">No setup fee, no contract, cancel anytime.</p>
            </div>
          </div>
        </section>

        {/* Advanced setup off-ramp — data residency, SSO, single-tenant.
            Sales conversation; intentionally separate from self-serve pricing. */}
        <section className="mt-6 md:mt-8 bg-card border border-border rounded-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Advanced setup · Enterprise &amp; Government
              </p>
              <h3 className="mt-2 text-lg md:text-xl font-semibold tracking-tight">
                Need data residency, SSO, or your own infrastructure?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Dedicated Supabase project in the region of your choice, white-label under your
                own brand and domain, SAML / OIDC single sign-on, AODA + WCAG 2.1 AA accessibility,
                bilingual UI, and procurement-friendly contracts. For REITs, large condo corps,
                and Canadian government customers.
              </p>
            </div>
            <Link
              href="/enterprise"
              className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-md border border-border hover:bg-muted text-sm font-semibold transition-colors"
            >
              Talk to us →
            </Link>
          </div>
        </section>

        {/* What they're getting + honest scope */}
        <section className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-md p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Live today
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>• Resident PWA + push notifications</li>
              <li>• Incident triage with severity + escalation</li>
              <li>• Work-order lifecycle + threaded notes</li>
              <li>• Audience-targeted announcements</li>
              <li>• Package log with pickup codes</li>
              <li>• Ontario RTA notice templates (N4 / N5 / N12)</li>
              <li>• AI announcement drafting + queue triage</li>
              <li>• Comms log CSV export for LTB / insurance</li>
              <li>• Per-user data export + account archive</li>
            </ul>
          </div>
          <div className="bg-card border border-border rounded-md p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Honest about what&apos;s next
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>• Stripe rent flow (compliance review pending)</li>
              <li>• Native iOS + Android apps (R3)</li>
              <li>• Vendor portal + insurance certs (R2)</li>
              <li>• Asset registry + preventive maintenance (R2)</li>
              <li>• AI assistant chat + tool use (R2)</li>
              <li>• French (Canada) UI (R2 — for QC customers)</li>
              <li>• SMS notifications (provider TBD)</li>
              <li>• Door access / NFC fobs (R3+)</li>
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-16 md:mt-20 text-center">
          <h2
            className="tracking-tight"
            style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
          >
            Two ways in.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            Start solo, or book 15 minutes with the founder for a live walkthrough.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-5 py-3 rounded-md bg-accent text-accent-foreground text-base font-semibold hover:bg-accent/90 transition-colors"
            >
              Start a free 90-day pilot →
            </Link>
            <Link
              href="/walkthrough"
              className="inline-flex items-center justify-center px-5 py-3 rounded-md border border-border hover:bg-muted text-base font-semibold transition-colors"
            >
              Book a walkthrough
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Questions? Reach the founder at{" "}
            <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">
              info@buildingsync.app
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}

const STOP_DOING = [
  {
    tag: "Email",
    title: "Forwarding maintenance requests between residents, FM, vendor, and yourself",
    description:
      "Residents file in the resident PWA. FM picks it up in /team/work-orders. Threaded notes keep the conversation in one place. Email + push fires automatically on every state change.",
  },
  {
    tag: "WhatsApp",
    title: "Posting announcements in 3 different building chats",
    description:
      "One audience-targeted broadcast in /team/announcements goes to email + in-app + push. Audience filter ensures tenants-only messages don't reach owner-residents.",
  },
  {
    tag: "Sheets",
    title: "Logging packages on a clipboard or notes app",
    description:
      "Concierge logs in /team/packages with a recipient picker. Pickup code auto-generated, push goes to the resident, picked-up tap clears the bin.",
  },
  {
    tag: "Word",
    title: "Re-typing N4 / N5 / N12 notices in a Word template every time",
    description:
      "Pre-filled with tenant + lease info. Service tracking. Printable PDF. Audit-logged for the eventual hearing.",
  },
  {
    tag: "Memory",
    title: "Hoping you remember which incident you escalated last month",
    description:
      "Append-only audit log + downloadable comms CSV. When the LTB or insurance asks, you have a date-windowed record in 30 seconds.",
  },
];

const MODULES = [
  {
    title: "Resident PWA",
    body: "Installable from Safari / Chrome to home screen. Push notifications for announcements, deliveries, and maintenance updates. iOS 16.4+ background-capable.",
  },
  {
    title: "Incident triage",
    body: "Concierge reports → BM/FM resolve. Severity (low / medium / high / urgent) drives the escalation push. Audit-logged from report through resolution.",
  },
  {
    title: "Work-order lifecycle",
    body: "Resident submits → SLA deadline computed → BM/FM triage with AI-assisted summary at the top. Threaded notes + email + push on every state change.",
  },
  {
    title: "Communications",
    body: "Audience-targeted announcements (all / tenants_only / specific units). Drafted by AI from a one-line brief. Email + push + in-app simultaneously.",
  },
  {
    title: "Package log",
    body: "Concierge logs incoming packages with auto-generated pickup codes. Recipients get a push the moment it arrives. One-tap mark-picked-up.",
  },
  {
    title: "Legal notices",
    body: "Ontario RTA templates: N4 (rent default), N5 (substantial breach), N12 (landlord's own use). Pre-filled, served-date tracking, printable.",
  },
  {
    title: "Audit + comms log",
    body: "Append-only event log + downloadable CSV (30 / 90 / 365 days). Hand it to counsel or insurance directly. PIPEDA / RTA evidence-grade.",
  },
  {
    title: "Settings + identity",
    body: "Tabbed settings per persona (BM / FM / Concierge / Resident). PIPEDA-compliant data export + soft-archive deletion. Notification preferences per channel.",
  },
];
