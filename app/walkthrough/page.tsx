import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/ui";

// Lead capture for the pilot funnel. Today the booking surface is a
// mailto link — once you have a Calendly / Cal.com link, drop the
// embed in below the email CTA. NEXT_PUBLIC_CALENDLY_URL env var
// drives the embed; absent → mailto only.

export const metadata: Metadata = {
  title: "Book a walkthrough — BuildingSync",
  description:
    "Book a 15-minute walkthrough of BuildingSync. We'll show you how a real building looks: incidents, maintenance, comms, deliveries, legal notices, and the AI assist. First 5 residential buildings get a free 90-day pilot.",
};

const TALKING_POINTS = [
  "What your day looks like inside BuildingSync (BM dashboard, work-order triage, comms log).",
  "How residents and tenants experience it — installable PWA, push notifications, deliveries, amenity bookings.",
  "Where AI assist actually saves you time today — announcement drafting and queue triage.",
  "Compliance: how we handle PIPEDA, LTB / RTA evidence, audit-grade event logs, and downloadable comms.",
  "Data residency — your tenant data stays in Canada (ca-central, Toronto). Custom regions for Enterprise.",
  "Pilot terms — 90 days free, white-glove setup, what happens after.",
];

export default function WalkthroughPage() {
  const calendly = process.env.NEXT_PUBLIC_CALENDLY_URL;

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

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Pilot · 5 buildings · 90 days free</p>
        <h1
          className="mt-4 tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
        >
          Book a 15-minute walkthrough.
        </h1>
        <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
          Live screen-share with the founder. We&apos;ll walk you through the BM dashboard end-to-end with a real building&apos;s data, then talk through whether BuildingSync fits your situation. No deck, no slides — just the actual product.
        </p>

        <section className="mt-10 bg-card border border-border rounded-xl p-6 md:p-8">
          <h2 className="text-xl font-semibold tracking-tight">The fastest paths in</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <span className="font-semibold">Email us.</span>{" "}
              <a
                href="mailto:info@buildingsync.app?subject=Walkthrough%20request&body=Hi%20BuildingSync%2C%0A%0AI%27d%20like%20to%20book%20a%2015-minute%20walkthrough.%0A%0AMy%20building%3A%20%5Bname%5D%0AUnits%3A%20%5Bcount%5D%0ARole%3A%20%5BBuilding%20Manager%20%2F%20Property%20Manager%20%2F%20Owner%5D%0ABest%20times%3A%20%5Bweekday%20%2B%20time%20windows%5D"
                className="text-accent hover:underline font-medium"
              >
                info@buildingsync.app
              </a>{" "}
              with your building name, unit count, and a couple of times that work for you. We&apos;ll come back inside one business day.
            </li>
            {calendly ? (
              <li>
                <span className="font-semibold">Pick a slot directly.</span>{" "}
                <a
                  href={calendly}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline font-medium"
                >
                  Open the calendar →
                </a>
              </li>
            ) : null}
            <li>
              <span className="font-semibold">Or skip the call.</span>{" "}
              <Link href="/signup" className="text-accent hover:underline font-medium">
                Start a free 90-day pilot
              </Link>{" "}
              and explore solo. We&apos;ll reach out 48 hours in to make sure you&apos;re onboarded.
            </li>
          </ul>
        </section>

        {calendly && (
          <section className="mt-8 bg-card border border-border rounded-xl overflow-hidden">
            <iframe
              src={calendly}
              title="Book a walkthrough"
              className="w-full h-[680px] border-0"
              loading="lazy"
            />
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">What we&apos;ll cover</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground leading-relaxed">
            {TALKING_POINTS.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="text-accent shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-md p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Right fit
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>• Residential buildings in Ontario / Canada</li>
              <li>• 20 to 400 units</li>
              <li>• You currently run things from email + spreadsheets</li>
              <li>• You&apos;d benefit from a comms paper-trail (LTB / RTA / insurance)</li>
            </ul>
          </div>
          <div className="bg-card border border-border rounded-md p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Probably not yet
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>• Commercial-only portfolios (residential is our R1 focus)</li>
              <li>• 1,000+ units (we&apos;re tuned for small/mid; reach out for Enterprise)</li>
              <li>• You need door access / NFC fobs (R2)</li>
              <li>• You need French-language UI (R2 — Quebec on the roadmap)</li>
            </ul>
          </div>
        </section>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          BuildingSync is a Node2.io service. Pilot terms in plain language, no auto-renew traps —{" "}
          <Link href="/terms" className="text-accent hover:underline">
            see Terms
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
