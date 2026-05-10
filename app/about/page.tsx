import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/ui";

// Founder + why-we-built-this page. Used as a credibility signal in
// cold outreach — the "click here to read why this exists" link in
// emails. Designed to be honest about scope (no claims of millions
// of buildings or category leadership) and to lean on the parent
// brand (Node2.io) for institutional context.

export const metadata: Metadata = {
  title: "About BuildingSync — Why we built this",
  description:
    "BuildingSync is a residential operations platform built by Ankur Sinha (Node2.io). Why it exists, what we believe, what we won't do.",
};

export default function AboutPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/40 bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center" aria-label="BuildingSync home">
            <Wordmark className="text-base md:text-lg" />
          </Link>
          <Link
            href="/walkthrough"
            className="inline-flex items-center px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted transition-colors"
          >
            Book a walkthrough
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">About</p>
        <h1
          className="mt-4 tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
        >
          Why we built BuildingSync.
        </h1>

        <section className="mt-10 prose prose-sm sm:prose-base prose-neutral dark:prose-invert max-w-none">
          <p>
            Property management runs on glue. Email threads with the plumber. WhatsApp groups for
            announcements. A spreadsheet for packages. A clipboard at the front desk for visitor
            log-ins. A Word template, copy-pasted every time, for the next N4 notice.
          </p>
          <p>
            None of this is wrong, individually. Each tool was a sensible choice when it was
            picked. What&apos;s wrong is the <em>seams</em> between them — the moments where context gets
            dropped, where a resident&apos;s second message lives in a different inbox from the first,
            where the BM has to reconstruct what happened from memory because nothing is the source
            of truth.
          </p>
          <p>
            BuildingSync is the source of truth those teams actually need. One platform — incidents,
            maintenance, communications, deliveries, legal notices — with an audit-grade event log
            underneath everything so that when the LTB or the insurance company asks, the answer is
            already on the record.
          </p>
          <p>
            We are deliberately small in scope today. Residential buildings in Ontario / Canada,
            20–400 units. We&apos;d rather be excellent for that one segment than mediocre for everyone.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">What we believe</h2>
          <ul className="mt-4 space-y-4 text-sm leading-relaxed">
            <li>
              <strong className="text-foreground">Software should reduce the BM&apos;s admin time, not their judgement.</strong>
              {" "}AI assist drafts, summarises, and triages — the BM still decides. We won&apos;t ship a
              feature that pretends to know your building better than you do.
            </li>
            <li>
              <strong className="text-foreground">Every interaction is evidence.</strong>{" "}
              An announcement isn&apos;t just sent — it&apos;s logged with audience, author, timestamp,
              and a downloadable trail. When a tribunal asks &quot;did you notify the tenant?&quot; you have a
              CSV.
            </li>
            <li>
              <strong className="text-foreground">Privacy is non-negotiable.</strong>{" "}
              Per-building data isolation. PIPEDA / Loi 25 aware. Per-user data export and
              soft-delete. We never sell or aggregate tenant data.
            </li>
            <li>
              <strong className="text-foreground">Your tenant data belongs in Canada.</strong>{" "}
              New buildings default to Canadian residency. We&apos;re completing the migration to
              Supabase ca-central-1 (Toronto) by R2. Custom regions and dedicated tenancy are
              available on{" "}
              <Link href="/enterprise" className="text-accent hover:underline">Enterprise</Link>.
            </li>
            <li>
              <strong className="text-foreground">Honesty in the marketing.</strong>{" "}
              Our pricing page lists what&apos;s live and what&apos;s roadmap, in plain English. No
              dark-pattern tiers, no contract lock-in, no &quot;contact sales&quot; gates on basic features.
              You can cancel from your settings page.
            </li>
            <li>
              <strong className="text-foreground">Mobile is not an afterthought.</strong>{" "}
              The resident app is a PWA today and a native app at R3. Push notifications work on
              iOS 16.4+ in installed PWAs. Concierge can run a shift from a phone.
            </li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">The team</h2>
          <p className="mt-4 text-sm leading-relaxed">
            BuildingSync is built by{" "}
            <a href="https://www.linkedin.com/in/sinha-ankur/" target="_blank" rel="noopener" className="text-accent hover:underline">
              Ankur Sinha
            </a>
            {" "}as a service of{" "}
            <a href="https://www.linkedin.com/company/node2-io/" target="_blank" rel="noopener" className="text-accent hover:underline">
              Node2.io
            </a>
            . Our HQ is in Canada with a development centre in Bengaluru, India. Funded out of
            pocket with a focus on real customer relationships over growth-at-all-costs metrics.
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            We&apos;re an AI-optimized startup — meaning we use AI tooling internally to ship
            faster than a team of our size historically could. That same discipline is reflected in
            the product: every interaction is captured as structured data so future AI features
            (chat assistant, semantic search, agent flows) can be added cleanly when customers
            actually pull for them.
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            We&apos;re small enough that the founder still answers support emails, and we plan to
            keep it that way until we have a reason not to.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">What we won&apos;t do</h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed">
            <li>• Sell or share your building&apos;s data — or anyone&apos;s.</li>
            <li>• Charge tenants any platform fee. (Ontario RTA s. 134.)</li>
            <li>• Build features for problems we don&apos;t understand. We&apos;d rather ship a small set well.</li>
            <li>• Make support a paywall. Email support is included on every tier today.</li>
            <li>• Ship AI that pretends to be the BM. Drafts and triage, yes. Decisions, no.</li>
          </ul>
        </section>

        <section className="mt-12 bg-card border border-border rounded-xl p-6 md:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Reach us</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Founder direct line:{" "}
            <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">
              info@buildingsync.app
            </a>
            . Press / partnerships: same address. We try to reply within one business day.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Link
              href="/walkthrough"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors text-sm"
            >
              Book a walkthrough
            </Link>
            <Link
              href="/for-property-managers"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors text-sm"
            >
              See the one-pager
            </Link>
            <Link
              href="/press"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors text-sm"
            >
              Press kit
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
