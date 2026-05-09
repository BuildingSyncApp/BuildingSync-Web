# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                 # next dev — http://localhost:3000
npm run build               # next build (Vercel uses this)
npm run start               # next start (production server, after build)
npm run lint                # eslint .
npm run typecheck           # tsc --noEmit (run before declaring work done)

npm run prisma:generate     # regenerate the client after schema.prisma changes
npm run prisma:migrate:dev  # create + apply a migration locally (uses DIRECT_URL)
npm run prisma:migrate:deploy
npm run prisma:studio       # GUI for the Postgres DB

npx tsx prisma/seed.ts [email]                      # seed demo Building + Unit; optionally link a user
npx tsx scripts/set-role.ts <email> <role>          # promote/demote a user's role for testing
npx tsx scripts/create-test-users.ts [password]     # bulk create the +bm/+fm/+concierge/+resident/+tenant test accounts
```

There is no test runner configured in `package.json`. Don't claim a feature passes tests — typecheck/lint are the only automated gates.

## Environment

`.env.example` is the source of truth for required vars. Two DB connection strings are required and serve different purposes — don't collapse them:

- `DATABASE_URL` — pooled (port 6543, pgbouncer transaction mode) → used at runtime by `lib/prisma.ts` via `@prisma/adapter-pg`.
- `DIRECT_URL` — direct connection (port 5432) → used by `prisma migrate` (see [prisma.config.ts](prisma.config.ts)). Migrations cannot run through pgbouncer.

`prisma.config.ts` explicitly loads `.env.local` (then `.env`) because dotenv only auto-loads `.env`. Standalone scripts (`scripts/*.ts`, `prisma/seed.ts`) do the same load themselves before instantiating Prisma.

## Architecture

### Three portal surfaces, one Next.js app

The same deployment serves three audiences. Routing is by URL prefix; the admin surface is also gated by hostname.

- **`/dashboard/*`** — resident/tenant portal (sign in, maintenance, announcements, documents, account, pay rent via Stripe Checkout).
- **`/team/*`** — building staff (BM = building_manager, FM = facility_manager, concierge). Per-persona nav is built in [app/team/layout.tsx](app/team/layout.tsx) — concierge is read-only on most things, FM doesn't post announcements, only BM hires staff.
- **`/platform/*`** — BuildingSync company admin (verifies BM signups, manages buildings + users globally). Lives at `admin.buildingsync.app`.

[proxy.ts](proxy.ts) handles the admin-host rewrite: when `host === ADMIN_HOST` (or starts with `admin.`), incoming paths are rewritten to `/platform/*`. Public auth flows (`/signin`, `/signup`, `/auth`, `/api`, `/_next`, static files) are pass-through. **If you add a new shared route that must be reachable from both hosts, add it to `PASS_THROUGH_PREFIXES`** or it will get prefixed with `/platform` on the admin host and 404.

> Was named `middleware.ts` until the Next 16 deprecation; the file convention is now `proxy.ts` and the function is `proxy`. The `utils/supabase/middleware.ts` helper file is unrelated — it's a session-refresh utility, not the Next convention file.

### Auth + identity

Supabase owns credentials; Prisma owns the app-side `User` row. The two are **keyed by the same uuid** (Supabase `auth.uid()`).

- [lib/auth.ts](lib/auth.ts) — `getOrCreateAppUser()` reads the Supabase session and upserts a Prisma `User` (defaulting role=`resident`). Use `requireUser()` in any server component / action that must be authed.
- [lib/team.ts](lib/team.ts) — `requireTeam()` for `/team/*`. Includes a **BM verification gate**: a `building_manager` with no `verifiedAt` is redirected to `/onboarding/pending` so they can't bypass the post-signin router by typing the URL.
- [lib/platform.ts](lib/platform.ts) — `requirePlatformAdmin()` for `/platform/*`. Bounces non-admin-host visits in production to `https://admin.buildingsync.app/platform`.

Post-signin landing is resolved server-side by [app/signin/actions.ts](app/signin/actions.ts) `resolvePortalUrl()`. Role flow:
- `admin` → `/platform` (cross-host redirect if not on admin host)
- `building_manager` (unverified) → `/onboarding/pending`
- BM/FM/concierge → `/team`
- otherwise (resident/tenant) → `/onboarding` if profile incomplete, else `/dashboard`

### Database / Prisma schema

**The Postgres DB is shared with the R&D project (`super-octo-rotary-phone`)** and contains many tables Website-Beta does not model. [prisma/schema.prisma](prisma/schema.prisma) is intentionally narrower than the live DB — see the file's top comment for the list of unmodeled tables (Amenity*, Notification*, governance_*, vendor_*, etc.). Some columns on modeled tables (e.g. `User.accessRoles UserRole[]`, `Building.amenities String[]`, `Unit.amenities String[]`) exist as nullable arrays in the DB but are **deliberately unmodeled** because Prisma can't represent a nullable scalar array.

Consequences:
- Don't `prisma db push` or run a destructive migration thinking the DB is wider than the schema "should" be — that's expected.
- When adding a new table, prefer `prisma migrate dev` so the migration file is reviewable. Use `db pull` only when adopting an R&D-side table.
- `WorkOrder.issue` (not `title`) and `Lease.leaseStartDate` (not `startDate`) preserve the live DB's R&D-era column names — don't rename without a migration plan.

`AuditLog` is **append-only** — never UPDATE or DELETE rows. It's evidence-grade for landlord-tenant disputes (LTB / RTA). Use [lib/audit.ts](lib/audit.ts) `logAuditFireAndForget()` from server actions; a failed audit write must never block the user-facing action.

### Side effects: email, audit, notifications

- [lib/email.ts](lib/email.ts) — Resend transactional email. **Always use `sendEmailFireAndForget`** from server actions; a slow or rejected email must not block the response. Templates wrap content in a CASL §6-compliant footer (sender ID, privacy/terms/contact links). If `RESEND_API_KEY` is unset, sends are skipped with a warn — useful in dev.
- [lib/audit.ts](lib/audit.ts) — same fire-and-forget contract; writes IP + user-agent from request headers.
- [lib/notifications.ts](lib/notifications.ts) — derives the bell-icon feed by querying existing tables (work orders + announcements). **There is no separate `Notification` model in this repo's schema** even though one exists in the live DB (it's an R&D table).

### Routing conventions

- Server-only secrets: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`. Never reference these from a `"use client"` file.
- Supabase clients: `utils/supabase/server.ts` (server components / actions), `utils/supabase/client.ts` (browser), `utils/supabase/middleware.ts` (session refresh in middleware). Don't instantiate `createServerClient` directly elsewhere.
- Path alias `@/*` → repo root (see [tsconfig.json](tsconfig.json)).

### PWA

App is installable. [app/manifest.ts](app/manifest.ts) emits the manifest; service worker is at `public/sw.js`; [vercel.json](vercel.json) overrides cache headers so updates ship promptly. Be careful changing `sw.js` — `must-revalidate` is intentional.

## Repo relationship to R&D

This is the **R1 production cut**. Phased / experimental work happens in `BuildingAi-Cloud/super-octo-rotary-phone`. The flow is **port forward only — don't bidirectional merge**. R1 features (resident sign-in, maintenance, announcements, BM/FM/concierge admin, Stripe Checkout, PWA install) are in scope here. AI chat, governance, vendor portal, owner banks, OCR, marketplace, audit-log UI, i18n, Stripe Connect are explicitly **out of R1** — if you find yourself wiring those, you've drifted.
