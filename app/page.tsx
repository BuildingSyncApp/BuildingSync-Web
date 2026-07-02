import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LinkButton, Wordmark } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SplitFlapText, SplitFlapAudioProvider, SplitFlapMuteToggle } from "@/components/SplitFlapText";
import { ProductHighlights } from "@/components/ProductHighlights";
import { MotionReveal, MotionRevealStagger, MotionRevealItem } from "@/components/MotionReveal";

const ADMIN_HOST = process.env.ADMIN_HOST || "admin.buildingsync.app";

export const metadata: Metadata = {
  title: "BuildingSync — The operations platform for residential buildings",
  description:
    "Run your building from one place — incidents, maintenance, communications, deliveries, legal notices, and resident workflows. AI assist where it saves time. Built for Building Managers, Facility Managers, and Concierge teams. Essential plan from $2.50 / unit / month.",
  openGraph: {
    title: "BuildingSync — The operations platform for residential buildings",
    description:
      "Incidents, maintenance, communications, deliveries, and legal notices in one place. AI assist where it saves time. Self-serve onboarding, mobile-first, privacy-first.",
    type: "website",
    siteName: "BuildingSync",
  },
};

type SP = Promise<{ go?: string; source?: string }>;

// Vercel-injected geo header. Falls back to Cloudflare's header for
// other hosts. Null in dev or behind a proxy that strips it.
function readVisitorCountry(h: Headers): string | null {
  return h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || null;
}

export default async function Home({ searchParams }: { searchParams: SP }) {
  const h = await headers();
  const host = h.get("host") || "";
  const isAdminHost = host === ADMIN_HOST || host.startsWith("admin.");
  const visitorCountry = readVisitorCountry(h);

  const session = await readSession();

  const params = await searchParams;
  let portalUrl: string | null = null;
  let portalLabel = "Continue";
  if (session) {
    // Defensive: a Prisma error here (e.g. a schema-vs-DB mismatch we
    // haven't caught yet) shouldn't 500 the public landing. Worst case
    // we render the anonymous landing and the user re-clicks Sign in.
    const appUser = await prisma.user
      .findUnique({ where: { id: session.sub } })
      .catch((err) => {
        console.error("[home] prisma.user.findUnique failed", err);
        return null;
      });
    if (appUser) {
      switch (appUser.role) {
        case "admin":
          portalUrl =
            isAdminHost || process.env.NODE_ENV !== "production"
              ? "/platform"
              : `https://${ADMIN_HOST}/platform`;
          portalLabel = "Open admin";
          break;
        case "building_manager":
        case "facility_manager":
        case "concierge":
          portalUrl = "/team";
          portalLabel = "Open team";
          break;
        default:
          portalUrl = "/dashboard";
          portalLabel = "Open dashboard";
      }
      // Old PWA installs have start_url=/?source=pwa from before the
      // manifest moved to /dashboard?source=pwa. When an authed PWA
      // user lands here, send them straight to their portal so they
      // see the v2 app, not the marketing site. Explicit ?go=1
      // (used by the post-signin redirect) does the same.
      if (params.go === "1" || params.source === "pwa") redirect(portalUrl);
    }
  }

  return (
    <>
      <SiteHeader />
      <main>
        <Hero portalUrl={portalUrl} portalLabel={portalLabel} visitorCountry={visitorCountry} />
        <Pathways />
        <ProductHighlights />
        <Principles />
        <Pricing />
        <Faq />
        <FinalCta />
        <SiteFooter />
      </main>
    </>
  );
}

function SiteHeader() {
  // Clean public header — no in-page anchor nav (the sections are right
  // below the fold anyway, scrolling is the natural way to discover them).
  // Just brand · theme toggle · sign in / get started.
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center" aria-label="BuildingSync home">
          <Wordmark className="text-base md:text-lg" />
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/signin"
            className="inline-flex items-center px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center px-3 md:px-4 py-1.5 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

// Geo-adapted "where we're built" line. Same parent message ("Built in
// Canada, AI-optimized startup, dev centre in India") with a suffix
// that speaks to the visitor's likely concern.
function builtInCopy(country: string | null): string {
  switch (country) {
    case "CA":
      return "Built in Canada · Your tenant data stays here";
    case "US":
      return "Built in Canada · Canadian privacy rules included";
    case "FR":
    case "DE":
    case "NL":
    case "GB":
    case "IE":
      return "Built in Canada · GDPR + PIPEDA aligned";
    case "IN":
      return "Built in Canada · Engineered with our Bengaluru team";
    case "AE":
    case "SA":
      return "Built in Canada · Custom data residency available";
    default:
      return "Built in Canada · AI-optimized startup, dev centre in India";
  }
}

function Hero({
  portalUrl,
  portalLabel,
  visitorCountry,
}: {
  portalUrl: string | null;
  portalLabel: string;
  visitorCountry: string | null;
}) {
  return (
    <section className="relative max-w-7xl mx-auto px-6 pt-12 md:pt-20 pb-16 md:pb-24">
      <SplitFlapAudioProvider>
        <div className="relative mb-8 md:mb-10">
          <SplitFlapText text="BUILDINGSYNC" speed={80} />
          <div className="mt-6 flex justify-start">
            <SplitFlapMuteToggle />
          </div>
        </div>
      </SplitFlapAudioProvider>

      <h1
        className="tracking-tight leading-[1.05] text-foreground"
        style={{
          fontFamily: "var(--font-bebas)",
          fontSize: "clamp(2.5rem, 5vw, 4rem)",
        }}
      >
        Run your building from one place.
      </h1>

      <p className="mt-5 md:mt-6 text-base md:text-lg text-muted-foreground max-w-160 leading-relaxed">
        Incidents, maintenance, communications, deliveries, and legal notices for Building Managers, Facility Managers, and Concierge teams. AI assist where it saves time — never as a replacement for your judgement.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-accent/40 bg-accent/10 text-xs font-mono uppercase tracking-widest text-accent">
          Pilot · 5 buildings · 90 days free
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-400">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          {builtInCopy(visitorCountry)}
        </span>
        {["Self-serve onboarding", "Cancel anytime"].map((proof) => (
          <span
            key={proof}
            className="inline-flex items-center px-3 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground"
          >
            {proof}
          </span>
        ))}
      </div>

      <div className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3">
        {portalUrl ? (
          <LinkButton href={portalUrl}>{portalLabel}</LinkButton>
        ) : (
          <>
            <LinkButton href="/signup">Start a free pilot →</LinkButton>
            <LinkButton href="/walkthrough" variant="outline">Book a 15-min walkthrough</LinkButton>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Free 90-day pilot for the first 5 residential buildings. No credit card. Includes white-glove setup. After 90 days: $2.50 / unit / month or cancel — your call. Everything before R3 is MVP; native iOS + Android apps ship with R3.
      </p>
    </section>
  );
}

const PATHWAYS = [
  {
    title: "Facility Manager",
    subtitle: "Operational uptime and response-time control",
    bullets: ["Work orders", "Status updates", "Vendor visibility"],
  },
  {
    title: "Building Manager",
    subtitle: "Resident operations and team execution",
    bullets: ["Onboard residents", "Post announcements", "Manage units"],
  },
  {
    title: "Concierge",
    subtitle: "Front-desk operations",
    bullets: ["Package log", "Read-only work orders", "Resident directory"],
  },
  {
    title: "Resident & Tenant",
    subtitle: "One app for the building",
    bullets: ["Submit maintenance", "Read announcements", "Manage account"],
  },
];

function Pathways() {
  return (
    <MotionReveal as="section" className="relative max-w-7xl mx-auto px-6 py-16 md:py-24 border-t border-border" y={16}>
      <span id="pathways" />
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">00 / Journey</p>
      <h2
        className="mt-4 tracking-tight"
        style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2rem, 5vw, 4rem)" }}
      >
        CHOOSE YOUR PATH
      </h2>
      <p className="mt-3 max-w-3xl font-mono text-xs md:text-sm text-muted-foreground leading-relaxed">
        Start from the workflow that matches your role. Move from onboarding to measurable outcomes without guesswork.
      </p>

      <MotionRevealStagger className="mt-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" stagger={0.08}>
        {PATHWAYS.map((p) => (
          <MotionRevealItem
            key={p.title}
            className="border border-border bg-card p-5 rounded-lg transition-transform duration-200 hover:-translate-y-0.5 hover:border-accent/60"
          >
            <p
              className="text-2xl tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-bebas)" }}
            >
              {p.title}
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{p.subtitle}</p>
            <ul className="mt-4 space-y-1.5">
              {p.bullets.map((b) => (
                <li key={b} className="font-mono text-[11px] text-foreground/80">• {b}</li>
              ))}
            </ul>
          </MotionRevealItem>
        ))}
      </MotionRevealStagger>
    </MotionReveal>
  );
}

const PRINCIPLES = [
  {
    number: "01",
    title: "Operational Excellence",
    summary: "Reduce reactive work with clear maintenance, incident, and comms workflows.",
    points: [
      "Incident triage with severity + escalation",
      "Open / assigned / closed work-order lifecycle",
      "Push + email on every state change",
    ],
  },
  {
    number: "02",
    title: "AI assist where it saves time",
    summary: "AI is wired in at points that genuinely cut admin — drafting, summarisation, triage. Never as a replacement for your judgement.",
    points: [
      "Today: AI-drafted announcements + work-order queue triage",
      "Foundation: structured data + audit-grade event log over every channel",
      "More AI surfaces (chat, semantic search, agent flows) ship progressively from R2",
    ],
  },
  {
    number: "03",
    title: "Security and Privacy",
    summary: "Protect people, assets, and data with row-level isolation and Supabase auth.",
    points: ["Per-building data isolation by buildingId", "Encrypted storage, audited auth flows", "Downloadable comms logs for LTB / RTA disputes"],
  },
  {
    number: "04",
    title: "Self-serve & Honest",
    summary: "No salesperson in the loop. No long-term contract.",
    points: ["Sign up, onboard a building, invite residents — under an hour", "Cancel anytime, export your data"],
  },
  {
    number: "05",
    title: "Mobile-first",
    summary: "Installable PWA today; native iOS and Android ship at R3.",
    points: ["Install from Safari or Chrome to home screen", "Push notifications, offline shell, brand-mark home tile", "Everything before R3 is MVP — features may evolve as customers shape it"],
  },
];

function Principles() {
  return (
    <section id="principles" className="relative max-w-7xl mx-auto px-6 py-16 md:py-24 border-t border-border">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">03 / Pillars</p>
      <h2
        className="mt-4 tracking-tight"
        style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2rem, 5vw, 4rem)" }}
      >
        CORE PILLARS
      </h2>
      <p className="mt-3 max-w-2xl font-mono text-xs md:text-sm text-muted-foreground leading-relaxed">
        Foundations that guide operations, security, transparency, and the mobile experience.
      </p>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {PRINCIPLES.map((p) => (
          <article
            key={p.number}
            className="border border-border bg-card p-5 md:p-6 rounded-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <h3
                className="text-2xl md:text-3xl tracking-tight leading-none text-foreground"
                style={{ fontFamily: "var(--font-bebas)" }}
              >
                {p.title}
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">{p.number}</span>
            </div>
            <p className="mt-3 font-mono text-xs md:text-sm text-muted-foreground leading-relaxed">{p.summary}</p>
            <ul className="mt-4 space-y-2">
              {p.points.map((point) => (
                <li key={point} className="font-mono text-xs text-foreground/85">• {point}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

// Essential lists ONLY features that are built and live in R1.
// Professional / Enterprise are roadmap — gated behind "Coming soon" CTAs
// so we don't promise transactions we can't fulfill.
const TIERS = [
  {
    name: "Essential",
    price: "$2.50",
    period: "/unit/month",
    description: "Per-unit pricing with role-based onboarding.",
    features: [
      "Resident & tenant portal (PWA)",
      "Building staff portal (BM, FM, Concierge)",
      "Maintenance request tracking + email notifications",
      "Community announcements with email broadcast",
      "Package notifications",
      "Single + bulk-CSV resident onboarding",
      "Profile & password self-service",
      "Email support",
    ],
    cta: "Get started",
    href: "/signup",
    highlight: true,
    available: true,
  },
  {
    name: "Professional",
    price: "$4.50",
    period: "/unit/month",
    description: "For property management companies.",
    features: [
      "All Essential features",
      "Multi-building portfolios",
      "Advanced reporting & exports",
      "Priority support",
      "SMS broadcasting (roadmap)",
      "Visitor & contractor management (roadmap)",
    ],
    cta: "Coming soon",
    href: null,
    highlight: false,
    available: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For REITs, large condo corps, multi-property operators.",
    features: [
      "All Professional features",
      "Dedicated tenant deployment (your own Supabase + Vercel)",
      "Canadian or custom data residency",
      "Single sign-on (SSO / SAML / OIDC)",
      "Custom API integrations + webhooks",
      "Dedicated customer success + named account manager",
      "Tailored onboarding, training, change management",
      "SOC 2 Type II + ISO 27001 (on roadmap)",
    ],
    cta: "Contact sales",
    href: "/enterprise",
    highlight: false,
    available: true,
  },
  {
    name: "Government",
    price: "Custom",
    period: "",
    description: "For municipal, provincial, federal, and Crown housing.",
    features: [
      "All Enterprise features",
      "Canadian-only data residency (ca-central, Toronto)",
      "AODA + WCAG 2.1 AA accessibility commitment",
      "Bilingual UI (English + French) — required for federal",
      "PIPEDA + Loi 25 + ITSG-33 alignment",
      "Procurement-friendly (RFI / RFP / SOW supported)",
      "Background-cleared support staff (CCCS posture)",
      "VPAT + accessibility audit on request",
    ],
    cta: "Talk to gov sales",
    href: "/enterprise?gov=1",
    highlight: false,
    available: true,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="relative max-w-7xl mx-auto px-6 py-16 md:py-24 border-t border-border">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">05 / Plans</p>
      <h2
        className="mt-4 tracking-tight"
        style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2rem, 5vw, 4rem)" }}
      >
        PRICING PLANS
      </h2>
      <p className="mt-3 max-w-3xl font-mono text-xs md:text-sm text-muted-foreground leading-relaxed">
        Per-unit pricing. No setup fees. Cancel anytime.
      </p>

      <div className="mt-6 bg-accent/10 border border-accent/40 rounded-lg p-4 md:p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-accent text-accent-foreground shrink-0">
            Pilot
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm md:text-base font-semibold text-foreground">
              Free 90 days for the first 5 residential buildings.
            </p>
            <p className="mt-1 text-xs md:text-sm text-muted-foreground leading-relaxed">
              No credit card. White-glove setup (we do it with you in a 30-min screen-share). After 90 days you pay the listed price or cancel — your call. Email{" "}
              <a href="mailto:info@buildingsync.app?subject=BuildingSync%20pilot" className="text-accent hover:underline">
                info@buildingsync.app
              </a>{" "}
              with your building name and unit count, or{" "}
              <Link href="/walkthrough" className="text-accent hover:underline">
                book a walkthrough
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`border rounded-lg p-6 flex flex-col ${
              t.highlight ? "border-accent bg-accent/5" : "border-border bg-card"
            }`}
          >
            <div className="flex items-start justify-between">
              <h3
                className="text-3xl tracking-tight"
                style={{ fontFamily: "var(--font-bebas)" }}
              >
                {t.name}
              </h3>
              {!t.available && (
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border border-border text-muted-foreground">
                  Roadmap
                </span>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-foreground">{t.price}</span>
              {t.period && <span className="text-sm text-muted-foreground">{t.period}</span>}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t.description}</p>
            <ul className="mt-5 space-y-2 flex-1">
              {t.features.map((f) => (
                <li key={f} className="text-sm text-foreground/90 flex gap-2">
                  <span className="text-accent">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {t.href ? (
                <Link
                  href={t.href}
                  className={`inline-flex items-center justify-center w-full px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    t.highlight
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : "border border-border hover:border-accent hover:text-accent"
                  }`}
                >
                  {t.cta}
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-md text-sm font-medium border border-border text-muted-foreground">
                  {t.cta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        All prices in USD. Stripe processing fees absorbed by the property manager — never charged to residents (Ontario RTA s. 134 compliant).
      </p>
    </section>
  );
}

const FAQS = [
  {
    q: "How long does setup take?",
    a: "Most buildings are live within an hour. Sign up, create your building, import units (CSV supported), invite residents — done. No implementation fee, no contract, no salesperson required.",
  },
  {
    q: "Do you have an iOS or Android app?",
    a: "Today, BuildingSync ships as an installable PWA (Progressive Web App). Residents and staff add it from Safari or Chrome to their home screen and get push notifications, an offline shell, and a brand-mark home tile — no app-store wait. Dedicated iOS and Android apps ship with R3. Everything before R3 is MVP and shaped by early-customer feedback.",
  },
  {
    q: "What does \"MVP\" mean here?",
    a: "BuildingSync is in MVP through R1 and R2. The core flows (announcements, maintenance, deliveries, push notifications, audit log, settings) are live and used in real buildings, but copy, layouts, and secondary features may evolve as we learn from pilot customers. Native iOS + Android apps land at R3 alongside the production billing portal. Pricing locks at R3.",
  },
  {
    q: "How much AI is actually in BuildingSync today?",
    a: "Two AI features ship today: AI-drafted announcements (BM types a one-line brief, Claude returns a polished draft to edit) and AI work-order triage (one-line scan of the open queue with prioritised recommendations). Both are powered by Claude (Anthropic) and clearly labelled in the UI. The bigger AI surfaces — a chat assistant, semantic search across history, agent flows for compound tasks — are honest R2/R3 work, not what's running today. We build the data foundation right (structured schemas, audit-grade event log) so those land cleanly when they ship. We'd rather under-promise and over-deliver than the other way around.",
  },
  {
    q: "Can I download communications for an LTB / RTA dispute?",
    a: "Yes. From /team/audit-log, the Building Manager can export a CSV of every announcement, work-order note, incident, and audit event in any 30 / 90 / 365-day window. Each row includes timestamp, channel, actor, audience, subject, body, and a stable reference id — usable as evidence in landlord-tenant disputes or for internal review.",
  },
  {
    q: "Is my building's data shared with other customers?",
    a: "No. Every building's data is row-level isolated by buildingId. We never aggregate or share tenant data across customers. Privacy-first by design.",
  },
  {
    q: "What happens to credit-card processing fees on rent?",
    a: "When rent payment ships, the landlord absorbs Stripe's processing fee. We never pass it to the tenant — Ontario's Residential Tenancies Act (s. 134) prohibits charging tenants any fee beyond lawful rent.",
  },
  {
    q: "Can I export my data and leave?",
    a: "Yes. Building admins can export the full building's records, and every user can download their own data. Standard formats only — CSV, JSON. No lock-in.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Month-to-month, no long-term contract. Cancel from Account and you stop being billed at the end of the current period. Your data stays available for 30 days for export.",
  },
];

function Faq() {
  return (
    <section id="faq" className="relative max-w-7xl mx-auto px-6 py-16 md:py-24 border-t border-border">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">06 / Questions</p>
      <h2
        className="mt-4 tracking-tight"
        style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2rem, 5vw, 4rem)" }}
      >
        QUESTIONS
      </h2>

      <div className="mt-10 max-w-3xl space-y-3">
        {FAQS.map((f, i) => (
          <details
            key={f.q}
            className="group border border-border bg-card rounded-lg overflow-hidden"
            open={i === 0}
          >
            <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
              <span className="text-sm font-medium text-foreground">{f.q}</span>
              <span className="text-muted-foreground group-open:rotate-45 transition-transform text-lg leading-none">+</span>
            </summary>
            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative max-w-7xl mx-auto px-6 py-16 md:py-24 border-t border-border">
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 md:p-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">Final Step</p>
        <h2
          className="mt-3 tracking-tight"
          style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(1.875rem, 4vw, 3rem)" }}
        >
          Ready to modernize your building operations?
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground leading-relaxed">
          Get started in under an hour. Self-serve onboarding, cancel anytime.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href="/signup">Get started</LinkButton>
          <LinkButton href="#pricing" variant="outline">View plans</LinkButton>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="max-w-7xl mx-auto px-6 py-12 md:py-16 border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        <div>
          <Wordmark className="text-base" />
          <p className="mt-3 font-mono text-xs text-muted-foreground max-w-xs leading-relaxed">
            Property management for residents, tenants, and the team that keeps the lights on.
          </p>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground">Product</p>
          <ul className="mt-3 space-y-2 font-mono text-xs text-muted-foreground">
            <li><a href="#pathways" className="hover:text-foreground transition-colors">For your role</a></li>
            <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
            <li><a href="#principles" className="hover:text-foreground transition-colors">Pillars</a></li>
            <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
            <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
          </ul>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground">Account</p>
          <ul className="mt-3 space-y-2 font-mono text-xs text-muted-foreground">
            <li><Link href="/signin" className="hover:text-foreground transition-colors">Sign in</Link></li>
            <li><Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link></li>
            <li><Link href="/walkthrough" className="hover:text-foreground transition-colors">Book a walkthrough</Link></li>
            <li><Link href="/for-property-managers" className="hover:text-foreground transition-colors">For property managers</Link></li>
            <li><Link href="/about" className="hover:text-foreground transition-colors">About + founder</Link></li>
            <li><Link href="/press" className="hover:text-foreground transition-colors">Press kit</Link></li>
          </ul>
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground font-mono">
        <p>
          © {new Date().getFullYear()} BuildingSync · a{" "}
          <a href="https://node2.io" rel="noopener" className="hover:text-foreground transition-colors">Node2.io</a>{" "}
          service
        </p>
        <div className="flex items-center gap-4">
          <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
          <Link href="/integrations" className="hover:text-foreground transition-colors">Integrations</Link>
          <Link href="/legal" className="hover:text-foreground transition-colors">Legal</Link>
          <Link href="/security" className="hover:text-foreground transition-colors">Security</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <a
            href="https://www.linkedin.com/company/node2-io/"
            rel="noopener"
            aria-label="Node2.io on LinkedIn"
            className="inline-flex items-center hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 0h-14C2.24 0 0 2.24 0 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5V5c0-2.76-2.24-5-5-5zM8 19H5V8h3v11zM6.5 6.73c-.97 0-1.75-.79-1.75-1.76s.78-1.76 1.75-1.76 1.75.79 1.75 1.76-.78 1.76-1.75 1.76zM20 19h-3v-5.6c0-3.37-4-3.11-4 0V19h-3V8h3v1.77c1.4-2.59 7-2.78 7 2.48V19z" />
            </svg>
            <span className="ml-2 hidden sm:inline">LinkedIn</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
