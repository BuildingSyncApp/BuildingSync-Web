# Changelog

Notable changes to BuildingSync-Web. Versions follow semver loosely
during R1; "stable" releases are tagged from `main` after a coherent
batch of work is verified in production.

## v0.2.0 — 2026-05-20

The verification-spine release. Captures the move from a one-time
sign-up gate to an always-on, region-aware, financially-literate
verification system. Plus a complete dashboard rethink, public
security + legal pages, and the supporting multi-repo product
family.

### Identity, location, and verification

- **Signup captures location** ([`components/LocationPicker.tsx`](components/LocationPicker.tsx))
  — interactive map via Leaflet (CDN, no API key), Nominatim
  reverse-geocoding, postal code with format validation, region
  auto-inferred from Canadian postal first-letter.
- **Region on User** ([`prisma/schema.prisma`](prisma/schema.prisma))
  — `region`, `postalCode`, `city`, `latitude`, `longitude` captured
  at signup, editable in account settings.
- **Postal-province cross-validation** ([`lib/postal.ts`](lib/postal.ts))
  applied at signup, account update, and building creation. Soft FSA
  check audit-logged at invite-code redemption.
- **Recurring manager verification** ([`prisma/schema.prisma`](prisma/schema.prisma)
  → `ManagerVerification`) — full history of admin reviews with
  snapshots of company facts, CMRAO licence, and **financial-
  management facts** (trust account bank, insurance carrier + policy +
  expiry, fidelity bond, reserve fund flag) per Ontario RTA + CMSA.
- **Re-verification cadence** — `nextVerificationDue` computed as
  soonest of (12 months, licence expiry - 60 days, insurance expiry
  - 60 days).
- **BM signup captures verification fields** — company name,
  manager type (CMRAO-licensed / management firm / incorporated /
  self-managed), Business Number, CMRAO licence.
- **Admin queue with quick-verify links** ([`app/platform/page.tsx`](app/platform/page.tsx))
  — one-click search of Ontario Business Registry, Corporations
  Canada, CMRAO registrant.
- **Admin rich review form** ([`app/platform/verifications/[userId]/review/`](app/platform/verifications/%5BuserId%5D/review/))
  — full financial-management capture, pre-filled from last review.
- **BM verification status + history page** ([`app/team/verification/`](app/team/verification/))
  — colour-coded status, append-only snapshot history of every
  admin review.
- **Re-verification banner** ([`components/ReverificationBanner.tsx`](components/ReverificationBanner.tsx))
  — escalates sky → amber → rose as the due date approaches.
- **Daily expiry sweep** ([`/api/cron/expire-verifications`](app/api/cron/expire-verifications/route.ts))
  — CRON_SECRET-protected; flips overdue MV rows to `expired` status
  + audit log.

### Compliance and legal

- **Region module** ([`lib/regions/`](lib/regions/)) — typed
  `Region`, `Law`, `NoticeTemplate`. Ontario fully populated
  (PIPEDA + MFIPPA, RTA + Human Rights Code, CASL, AODA, N4/N5/N12).
  QC, BC, AB, CA-US, NY-US planned.
- **Public `/legal` page** ([`app/legal/`](app/legal/)) — per-region
  legal & compliance summary. Defaults to user's region when authed.
- **Public `/security` page** ([`app/security/`](app/security/)) —
  vulnerability surface, availability, backup, SLA per tier,
  incident response, honest disclosure of gaps (SOC 2 R3, MFA opt-in,
  status page R2).

### UX overhaul

- **Dashboard rewrite** ([`app/dashboard/page.tsx`](app/dashboard/page.tsx))
  — bento layout: Hero · Today + Quick actions · Recent activity
  (unified feed) · Shortcuts grid · Help footer. Replaced 9 stacked
  sections.
- **Intuitive notifications** ([`components/NotificationBell.tsx`](components/NotificationBell.tsx))
  — time-grouped (Today / Yesterday / Earlier), per-kind colour
  + icon, pulse animation on unread badge, mark-all-read.
- **Mobile bottom tabs rethought** — Home · Repairs · (+) · Notices
  · Menu. Promoted maintenance from FAB to primary tab.
- **Multi-level pill nav** ([`components/PortalNav.tsx`](components/PortalNav.tsx))
  — L1 + L2 + position breadcrumb, matches the R&D pattern.
- **Accessibility icon** swapped to the Universal Access Symbol.
- **Language selector now actually works** — `<html lang>` + `<dir>`
  flip from cookie; toast confirms saves; "preview" pill on
  untranslated locales.
- **Help Centre at `/docs`** rewritten in plain language; no paths,
  no code, no jargon.
- **Welcome card** on first dashboard visit (dismissible) for
  orientation.

### Onboarding flows

- **`/team/residents` redesign** with three-tab panel: invite link
  (default — lowest friction, residents self-onboard) · add manually
  · bulk CSV.
- **`/team/units` bulk CSV import** — paste or upload, duplicates
  skipped.
- **Add-resident bug fix** — early `SUPABASE_SERVICE_ROLE_KEY`
  check, welcome email now fire-and-forget.

### Multi-repo product family

- **`BuildingSync-Onprem`** (private) — full on-premise SKU scaffold
  with Docker Compose, deployment + compliance + sync docs, license
  server primitives. Lives at the dedicated private repo.
- **`BuildingSync-OpenAPI`** (private) — OpenAPI 3.1 spec, openapi-
  generator config for TypeScript / Swift / Kotlin clients, CI to
  auto-regenerate on spec push.
- **`BuildingSync-Core`** (private) — shared domain code mirror from
  `packages/core/` here.
- **CI sync workflows** ([`.github/workflows/sync-{openapi,core}.yml`](.github/workflows/))
  push canonical artefacts from this repo to the mirror repos on
  every change.
- **Repo rename + naming convention** — `Website-Beta` →
  `BuildingSync-Web`, `super-octo-rotary-phone` → `BuildingSync-Lab`,
  consistent `BuildingSync-*` prefix family-wide.

### White-label and brand

- **`lib/brand.ts`** — env-driven brand tokens
  (`NEXT_PUBLIC_BRAND_*`); manifest + footer adapt per deployment.
- **Email body sweep** — all transactional emails read brand name +
  attribution from `lib/brand.ts`.
- **`branding/` folder** with per-page-type README maps (marketing,
  auth, portal-resident, portal-team, portal-platform, pwa, email,
  github) documenting which surfaces need swapping for white-label.
- **OpenAPI dev portal** at `/developers` with Stoplight Elements.
- **Dual-auth helper** (`lib/api-auth.ts`) so mobile clients can
  use Supabase Bearer JWTs against the same endpoints.

### Compliance posture (honest about gaps)

- ✅ PIPEDA + Loi 25 + CASL + AODA + Ontario RTA + CMSA covered for
  Ontario customers
- ✅ Append-only audit log over every state change
- ✅ Per-user data export (PIPEDA Art. 4.9)
- ✅ Signed releases for on-prem (Ed25519 license server)
- ⏳ SOC 2 Type II — R3 roadmap
- ⏳ Mandatory MFA — R2 roadmap
- ⏳ Public status page — R2 roadmap
- ⏳ Regular external pen test — starts at 100 customers or first
  Enterprise/Government deal

### Activation steps for production

1. `npx prisma migrate deploy` — applies all new schema changes
   (User region/postal/lat/lng, BM verification fields, ManagerVerification
   table, OnpremLicense table)
2. Set `CRON_SECRET` env var in Vercel for the daily verification
   expiry sweep
3. Optional: backfill `User.lastVerifiedAt` + `nextVerificationDue`
   for existing verified BMs to start their renewal clock
4. Optional: set up `PAT_TOKEN_FOR_PUSH` for the BuildingSync-Web →
   OpenAPI / Core sync workflows
5. Optional: run `node scripts/generate-onprem-keys.mjs` and set
   `ONPREM_LICENSE_{PRIVATE,PUBLIC}_KEY_B64` if you're issuing on-prem
   licences

## v0.1.0 — initial R1 cut

Resident sign-in, maintenance, announcements, BM/FM/concierge admin,
Stripe Checkout (wired, compliance review pending), PWA install,
per-persona post-login routing, BM verification gate.
