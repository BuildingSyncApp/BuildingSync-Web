import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/ui";

// Press / partnership kit. Boilerplate description, founder bio, brand
// assets, and a single contact line. Designed so a journalist or
// podcast host can grab everything they need from one page without
// emailing first.

export const metadata: Metadata = {
  title: "Press kit — BuildingSync",
  description:
    "Boilerplate, brand assets, founder bio, and contact for press, partnerships, and conference appearances.",
};

const BOILERPLATE_SHORT = `BuildingSync is an operations platform for residential buildings — incidents, maintenance, communications, deliveries, and legal notices in one place. Built for Building Managers, Facility Managers, and Concierge teams in Ontario / Canada. A service of Node2.io. buildingsync.app`;

const BOILERPLATE_LONG = `BuildingSync is the operations platform Building Managers run their day on. It replaces the patchwork of email threads, WhatsApp groups, package spreadsheets, and Word-doc N4 templates with one platform that captures every interaction as structured, audit-grade data. Designed for residential buildings of 20–400 units in Ontario and Canada, BuildingSync includes resident PWA, push notifications, AI-assisted announcement drafting and work-order triage, downloadable communications logs for LTB/insurance evidence, Ontario RTA notice templates (N4/N5/N12), and a per-building invite system for friction-free resident onboarding. PIPEDA and Loi 25 aware. A service of Node2.io. Founded 2026. buildingsync.app.`;

const FOUNDER_BIO = `Shweta Sharma is the founder of BuildingSync and a service of Node2.io. She started BuildingSync after watching property managers in her own building reconstruct critical context from memory because nothing was the source of truth. BuildingSync is the operations layer those teams actually need — opinionated, audit-grade, and small enough that the founder still answers support emails. Based in Canada with a development centre in India.`;

const FACTS = [
  { label: "Founded", value: "2026" },
  { label: "Headquarters", value: "Canada (Toronto area)" },
  { label: "Development centre", value: "India" },
  { label: "Parent organization", value: "Node2.io" },
  { label: "Target market", value: "Residential buildings, 20–400 units, Ontario / Canada" },
  { label: "Pricing", value: "From $2.50 / unit / month (Essential)" },
  { label: "Pilot offer", value: "Free 90 days for first 5 buildings, no credit card" },
];

const COVERAGE_HOOKS = [
  "How a small founder-led SaaS in Toronto is taking on the property-management incumbents (Buildium, AppFolio, Yardi, Condo Control)",
  "PIPEDA + Loi 25 alignment in a category that historically has not cared",
  "AI-assisted announcement drafting and work-order triage — what AI in property management actually looks like vs. the hype",
  "The case for downloadable communications logs as LTB / RTA evidence — a paper trail without the paper",
  "Why a PWA, not a native app, for the resident-facing experience (and why native still ships at R3)",
];

export default function PressPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/40 bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center" aria-label="BuildingSync home">
            <Wordmark className="text-base md:text-lg" />
          </Link>
          <a
            href="mailto:info@buildingsync.app?subject=Press%20inquiry"
            className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors"
          >
            Email press
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Press kit</p>
        <h1
          className="mt-4 tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
        >
          Press &amp; partnerships.
        </h1>
        <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
          Everything you need to write about BuildingSync without emailing first. Founder is happy
          to speak on the record — booking link below.
        </p>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Quick facts</h2>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FACTS.map((f) => (
              <div key={f.label} className="bg-card border border-border rounded-md px-4 py-3">
                <dt className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {f.label}
                </dt>
                <dd className="mt-1 text-sm font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Boilerplate — short</h2>
          <p className="mt-2 text-xs text-muted-foreground">For tweet-length mentions and conference programs.</p>
          <pre className="mt-3 text-sm bg-card border border-border rounded-md p-5 whitespace-pre-wrap font-sans leading-relaxed">
            {BOILERPLATE_SHORT}
          </pre>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">Boilerplate — long</h2>
          <p className="mt-2 text-xs text-muted-foreground">For press releases and longer mentions.</p>
          <pre className="mt-3 text-sm bg-card border border-border rounded-md p-5 whitespace-pre-wrap font-sans leading-relaxed">
            {BOILERPLATE_LONG}
          </pre>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Founder bio</h2>
          <p className="mt-3 text-sm bg-card border border-border rounded-md p-5 leading-relaxed">
            {FOUNDER_BIO}
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Brand assets</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            For high-resolution logo files (SVG / PNG), brand colours, and screenshot
            packs:
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href="/icon.svg"
                download
                className="text-accent hover:underline"
              >
                BuildingSync icon · SVG
              </a>{" "}
              <span className="text-muted-foreground">— scalable, transparent</span>
            </li>
            <li>
              <a
                href="/icons/icon-512.png"
                download
                className="text-accent hover:underline"
              >
                BuildingSync icon · 512×512 PNG
              </a>
            </li>
            <li>
              <a
                href="/icons/icon-192.png"
                download
                className="text-accent hover:underline"
              >
                BuildingSync icon · 192×192 PNG
              </a>
            </li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Brand colours: cream <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted/40">#EFEAE0</code>{" "}
            (Paper background), accent terracotta{" "}
            <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted/40">#C45F3C</code>, ink{" "}
            <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted/40">#141414</code>.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Need a screenshot pack or a custom asset for an article? Email{" "}
            <a href="mailto:info@buildingsync.app?subject=Press%20kit%20asset%20request" className="text-accent hover:underline">
              info@buildingsync.app
            </a>{" "}
            and we&apos;ll send within 24 hours.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Story angles we&apos;d love to talk about</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed">
            {COVERAGE_HOOKS.map((hook) => (
              <li key={hook} className="flex gap-3">
                <span className="text-accent shrink-0">•</span>
                <span>{hook}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 bg-card border border-border rounded-xl p-6 md:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
          <p className="mt-3 text-sm leading-relaxed">
            <strong>Press / partnerships / podcast bookings:</strong>{" "}
            <a href="mailto:info@buildingsync.app?subject=Press%20inquiry" className="text-accent hover:underline">
              info@buildingsync.app
            </a>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We try to reply within one business day. Founder is willing to speak on the record about
            the product, market, and AI-in-property-management more broadly.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Link
              href="/about"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors text-sm"
            >
              About + founder
            </Link>
            <Link
              href="/for-property-managers"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors text-sm"
            >
              One-pager for prospects
            </Link>
            <Link
              href="/walkthrough"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors text-sm"
            >
              Book a walkthrough
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
