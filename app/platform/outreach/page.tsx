import { requirePlatformAdmin } from "@/lib/platform";
import { CopyButton } from "./CopyButton";

// Internal cold-outbound templates for the founder. Admin-only.
// Three channels (cold email, LinkedIn DM, condo-board email).
// Each template uses {{placeholders}} the founder swaps in before
// sending. Living document — refine these as you learn what
// resonates in real conversations.

const PUBLIC_BASE = "https://buildingsync.app";

const TEMPLATES = [
  {
    id: "cold-email-bm",
    title: "Cold email — Building Manager",
    when: "When you have a name + email and the building has < 200 units.",
    subject: "Replace 5 tools with one — free 90-day pilot at {{Building Name}}",
    body: `Hi {{First name}},

I built BuildingSync because every BM I talked to was running their building from 3 inboxes, a WhatsApp group, and a clipboard. We replace those with one platform — incidents, maintenance, communications, deliveries, legal notices, and an audit-grade comms log you can hand to the LTB if it ever comes to that.

We're opening a free 90-day pilot to the first 5 residential buildings. No credit card, white-glove setup (I do it with you in a 30-min screen-share). After 90 days you pay $2.50/unit/month or cancel — your call.

If it's interesting, here's the one-pager: ${PUBLIC_BASE}/for-property-managers
Or pick a 15-minute slot directly: ${PUBLIC_BASE}/walkthrough

Either way, no obligation.

— {{Your name}}
Founder, BuildingSync (a Node2.io service)`,
  },
  {
    id: "linkedin-dm-bm",
    title: "LinkedIn DM — Building Manager / Property Manager",
    when: "First-degree or 2nd-degree connection on LinkedIn. Keep it under 300 chars so the preview shows everything.",
    subject: "(no subject — DM)",
    body: `Hey {{First name}}, I'm building BuildingSync — operations platform for residential buildings (incidents, maintenance, comms, RTA notices). Free 90-day pilot for the first 5 buildings. Worth 15 min for a walkthrough? ${PUBLIC_BASE}/walkthrough`,
  },
  {
    id: "condo-board",
    title: "Email — Condo board / property mgmt company",
    when: "When you're emailing a board chair or a small property mgmt company that runs multiple buildings.",
    subject: "Free pilot: BuildingSync for {{Building name or company}}",
    body: `Hi {{First name}},

Quick intro — I'm the founder of BuildingSync, an operations platform for residential buildings. Two reasons I'm reaching out:

1. We're opening a free 90-day pilot to the first 5 residential buildings in Ontario. Includes white-glove setup and direct founder support throughout.

2. {{Specific reason why this building / company in particular — e.g. "I noticed your last AGM minutes mentioned communication challenges with residents" or "your building has the package volume that our concierge flow is built for"}}

What we replace:
• Email threads + spreadsheets for work orders → triage queue with SLA tracking
• WhatsApp / paper notices for announcements → one broadcast, audience-filtered, with a CSV paper trail
• Word-doc N4 / N5 / N12 notices → pre-filled templates with served-date tracking
• Clipboard package log → resident push with pickup code

After the pilot it's $2.50/unit/month — Essential plan covers everything in box. No setup fee, no contract, cancel anytime.

If you want the full picture: ${PUBLIC_BASE}/for-property-managers
If you'd rather just see it: ${PUBLIC_BASE}/walkthrough

Happy to answer anything.

— {{Your name}}
Founder, BuildingSync (a Node2.io service)
${PUBLIC_BASE}`,
  },
  {
    id: "follow-up",
    title: "Follow-up — no response after 5 business days",
    when: "Use sparingly. Once. Don't send a third.",
    subject: "Re: Replace 5 tools with one — free 90-day pilot at {{Building Name}}",
    body: `Hi {{First name}},

Bumping this up in case it slipped through. No worries if the timing isn't right — happy to pick this up whenever it makes sense for you.

If you'd rather just kick the tires solo, the 90-day free pilot signup is here: ${PUBLIC_BASE}/signup

— {{Your name}}`,
  },
  {
    id: "intro-warm",
    title: "Warm intro — when someone offers to introduce you",
    when: "Forward this to the introducer to use as the body of their intro email.",
    subject: "(introducer fills this in)",
    body: `Hi {{Mutual contact}}, meet {{Founder name}} — they're the founder of BuildingSync, an operations platform for residential buildings (incidents, maintenance, communications, RTA notices, the works). They're running a free 90-day pilot for the first 5 buildings and I thought you'd want to know about it given {{specific reason}}.

{{Founder name}} — over to you.

One-pager: ${PUBLIC_BASE}/for-property-managers
15-min walkthrough: ${PUBLIC_BASE}/walkthrough`,
  },
];

const QUALIFIERS = [
  {
    label: "Right fit",
    items: [
      "Residential building in Ontario / Canada",
      "20–400 units (small-mid is our sweet spot)",
      "Currently running on email + spreadsheets + WhatsApp",
      "Cares about audit trail / LTB hearings / insurance evidence",
    ],
  },
  {
    label: "Disqualifies",
    items: [
      "Commercial-only portfolio",
      "1,000+ units (suggest waiting for Enterprise tier)",
      "Hard requirement: BLE door access, NFC fobs, French UI (R2/R3)",
      "Already locked into a multi-year contract with a competitor",
    ],
  },
];

export default async function OutreachPage() {
  await requirePlatformAdmin();

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-4xl mx-auto pb-12">
      <div className="space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Platform admin · Sales tools
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Outreach templates</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Cold-outbound copy for the pilot funnel. Swap the{" "}
          <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted/40">{`{{placeholders}}`}</code> before
          sending. Refine these as you learn what works in real conversations.
        </p>
      </div>

      <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUALIFIERS.map((q) => (
          <div key={q.label} className="bg-card border border-border rounded-md p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {q.label}
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {q.items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div className="mt-10 space-y-6">
        {TEMPLATES.map((t) => (
          <article key={t.id} className="bg-card border border-border rounded-md overflow-hidden">
            <header className="px-5 py-4 border-b border-border bg-muted/20">
              <h2 className="text-base font-semibold">{t.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t.when}</p>
            </header>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Subject
                  </p>
                  {t.subject !== "(no subject — DM)" && (
                    <CopyButton text={t.subject} label="Copy subject" />
                  )}
                </div>
                <p className="mt-1 text-sm font-mono bg-background border border-border rounded px-3 py-2">
                  {t.subject}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Body
                  </p>
                  <CopyButton text={t.body} label="Copy body" />
                </div>
                <pre className="mt-1 text-sm bg-background border border-border rounded px-3 py-3 whitespace-pre-wrap font-sans leading-relaxed">
                  {t.body}
                </pre>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        These templates are living docs. Update them in{" "}
        <code className="font-mono text-xs">app/platform/outreach/page.tsx</code> as you learn what resonates.
      </p>
    </main>
  );
}
