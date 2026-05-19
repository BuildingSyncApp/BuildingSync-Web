import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/ui";
import { DeveloperApiExplorer } from "./DeveloperApiExplorer";

export const metadata: Metadata = {
  title: "Developers — BuildingSync",
  description:
    "BuildingSync developer portal. OpenAPI specification, authentication guide, and real-time sync notes for iOS, Android, and third-party integrations.",
};

export default function DevelopersPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/40 bg-background/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center" aria-label="BuildingSync home">
            <Wordmark className="text-base md:text-lg" />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              Help Centre
            </Link>
            <a
              href="/api/openapi"
              className="inline-flex items-center px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
            >
              Download spec
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Developer portal · preview</p>
          <h1
            className="mt-4 tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
          >
            Build on BuildingSync.
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            A unified HTTP API and real-time sync layer for iOS, Android, and
            authorized third-party integrations. Designed so a native client
            can stay in lockstep with the web app with minimal effort.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/api/openapi"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-accent text-accent-foreground text-base font-semibold hover:bg-accent/90 transition-colors"
            >
              OpenAPI 3.1 spec
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
            <a
              href="#auth"
              className="inline-flex items-center px-5 py-3 rounded-md border border-border hover:bg-muted text-base font-semibold transition-colors"
            >
              Authentication
            </a>
            <a
              href="#realtime"
              className="inline-flex items-center px-5 py-3 rounded-md border border-border hover:bg-muted text-base font-semibold transition-colors"
            >
              Real-time sync
            </a>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            This is a preview release. Endpoints may change before v1 — we
            will give 30 days&apos; notice via the <code className="font-mono text-xs">Deprecation</code> response header.
          </p>
        </section>

        <Divider />

        {/* Quick start */}
        <Section eyebrow="01 · Quick start" title="Three steps to your first request">
          <Step n={1} title="Sign in with Supabase Auth from your mobile client">
            BuildingSync uses Supabase Auth. Use the official Supabase SDK
            for iOS (Swift) or Android (Kotlin) with the public Supabase URL
            and publishable key — same credentials as the web app. After
            <code className="font-mono text-xs"> signInWithPassword</code> (or your
            chosen flow), retain the access token.
          </Step>
          <Step n={2} title="Send the access token on every API call">
            Set the header <code className="font-mono text-xs">Authorization: Bearer &lt;access_token&gt;</code>
            on every request. Tokens are short-lived; refresh with the
            standard Supabase SDK refresh flow before they expire.
          </Step>
          <Step n={3} title="Call any endpoint in the spec">
            All endpoints accept the same Bearer token. For example, to list
            the signed-in user&apos;s maintenance requests:
            <pre className="mt-3 bg-muted/40 border border-border rounded-md p-3 font-mono text-[12px] overflow-x-auto">{`curl https://www.buildingsync.app/api/work-orders \\
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"`}</pre>
          </Step>
        </Section>

        <Divider />

        {/* Auth */}
        <Section eyebrow="02 · Authentication" title="Cookie session and Bearer JWT" id="auth">
          <p>
            BuildingSync endpoints accept two interchangeable authentication
            methods. Native clients should always use Bearer tokens; the
            cookie path exists for the web app.
          </p>

          <Card title="Bearer JWT (recommended for mobile)">
            Authenticate the user with Supabase Auth in your native app,
            then send <code className="font-mono text-xs">Authorization: Bearer &lt;access_token&gt;</code>
            on every request. The token carries the user identity — the
            BuildingSync server validates it against Supabase and looks
            up the matching app-side user record.
          </Card>

          <Card title="Cookie session (web)">
            The BuildingSync web app signs in through Supabase SSR and
            forwards the session cookie automatically. Native clients
            should not attempt to replicate this; use Bearer tokens
            instead.
          </Card>

          <Card title="Permissions">
            Every endpoint returns <code className="font-mono text-xs">401</code> when not signed in,
            and <code className="font-mono text-xs">403</code> when the caller&apos;s role is not
            permitted (e.g. only Building Managers can post building-wide
            announcements). The full permission model is documented in
            the spec on each endpoint.
          </Card>
        </Section>

        <Divider />

        {/* Real-time */}
        <Section eyebrow="03 · Real-time sync" title="Stay in lockstep with the web app" id="realtime">
          <p>
            For low-latency sync — what the user sees on their phone
            should match what they see on the web within milliseconds —
            BuildingSync recommends Supabase Realtime over polling. The
            mobile client subscribes to row-level Postgres change streams
            using the same Supabase credentials.
          </p>

          <Card title="What to subscribe to">
            Typical mobile subscriptions are <code className="font-mono text-xs">work_orders</code>
            (filtered by <code className="font-mono text-xs">building_id</code> for staff or
            <code className="font-mono text-xs"> opened_by_id</code> for residents),
            <code className="font-mono text-xs"> announcements</code> (filtered by building), and
            <code className="font-mono text-xs"> deliveries</code> (filtered by recipient).
            Supabase Row-Level Security (RLS) is enforced — your client only
            receives rows the user is allowed to see.
          </Card>

          <Card title="Push notifications">
            Off-device delivery is handled via Web Push (browser), and via
            APNs / FCM for native apps. Native clients register their
            device token through the same <code className="font-mono text-xs">/api/push/subscribe</code>
            endpoint used by web clients. Native push routing lands in a
            forthcoming spec revision.
          </Card>

          <Card title="Conflict resolution">
            All resource updates are server-authoritative — the latest
            value the server accepted wins. Clients should treat
            Realtime events as the source of truth and reconcile their
            local cache on every event.
          </Card>
        </Section>

        <Divider />

        {/* Interactive */}
        <Section eyebrow="04 · Reference" title="Interactive API reference">
          <p>
            The full endpoint reference is rendered below from the
            OpenAPI 3.1 specification. You can try requests directly from
            this page once signed in (cookie session) — for Bearer
            requests, use the spec download with your tooling of choice
            (curl, Postman, OpenAPI Generator).
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a href="/api/openapi" className="inline-flex items-center px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors">
              openapi.yaml
            </a>
            <a
              href="https://github.com/OpenAPITools/openapi-generator"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
            >
              Generate clients (Swift / Kotlin)
            </a>
          </div>

          <div className="mt-8">
            <DeveloperApiExplorer />
          </div>
        </Section>

        <Divider />

        {/* Status / contact */}
        <Section eyebrow="05 · Status" title="Roadmap &amp; contact">
          <Card title="What&rsquo;s in this preview">
            Work orders, announcements, Web Push subscriptions, and
            personal data export. These are the endpoints the iOS and
            Android apps need on day one.
          </Card>
          <Card title="What&rsquo;s next">
            Amenity reservations, deliveries, payments, documents, and a
            staff scheduling surface — each will arrive with its own
            schema in subsequent spec releases. Webhooks for outbound
            event delivery are planned alongside.
          </Card>
          <Card title="Get in touch">
            Building something on BuildingSync? We&rsquo;d love to hear
            about it. Email{" "}
            <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">info@buildingsync.app</a>{" "}
            with your use case and we&rsquo;ll get you set up.
          </Card>
        </Section>
      </main>

      <footer className="max-w-7xl mx-auto px-4 md:px-6 py-8 border-t border-border text-center">
        <p className="text-xs text-muted-foreground font-mono">
          © {new Date().getFullYear()} BuildingSync · a Node2.io service ·{" "}
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          {" · "}
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          {" · "}
          <Link href="/legal" className="hover:text-foreground transition-colors">Legal &amp; compliance</Link>
        </p>
      </footer>
    </div>
  );
}

function Section({
  title,
  eyebrow,
  id,
  children,
}: {
  title: string;
  eyebrow: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">{eyebrow}</p>
      <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
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

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="shrink-0 w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center font-mono text-xs text-accent font-semibold">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-14 md:my-16 border-t border-border/60" />;
}
