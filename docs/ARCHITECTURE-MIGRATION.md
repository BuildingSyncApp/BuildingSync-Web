# Architecture & migration blueprint

> **Status:** PLANNING — no production changes yet. This document is the agreed
> blueprint to review *before* any infra/auth/payment work begins.
> Decisions captured 2026-06-22.

This note ties together the major in-flight changes to BuildingSync-Web so they
can be reviewed as one coherent plan rather than ad-hoc edits to the live product
(buildingsync.app). It complements [security-model.md](security-model.md) — read
that first; the tenant-isolation invariant there survives every change below.

---

## 1. Goals (the "why")

1. **Move hosting** Vercel → **Cloudflare** (free tier).
2. **Move data** Supabase → **Neon** Postgres, provisioned **in Canada
   (`ca-central-1`)** for data residency. Supabase was beta-only, so this is a
   **clean rebuild, not a data migration**.
3. **Own authentication** — replace Supabase Auth with **Auth.js (NextAuth) +
   argon2id**, so all data (incl. credentials) lives in our Canadian DB.
4. **Region-aware from signup** — the customer's region (already captured at
   signup) drives data residency; Canada-first, expandable to US/intl/gov.
5. **Bring-your-own infra** — advanced/enterprise/gov tenants can supply their
   **own DB + server**; we route their tenant to it.
6. **Pluggable, region-specific payments** — cards (NA/EU), **UPI (India)**,
   Russian rails, etc. — never store card/bank/UPI credentials.
7. **Compliance** — PIPEDA + Quebec Law 25 + public-sector; designed to extend
   to US/intl.
8. **Ship web + mobile** to real users.

---

## 2. Current state (verified, not assumed)

| Concern | Today |
|---|---|
| Host | Vercel (`vercel.json`, `output: "standalone"`) |
| DB | Supabase Postgres via Prisma 7 + `@prisma/adapter-pg` (`lib/prisma.ts`, one global client off `DATABASE_URL`) |
| Auth | **Supabase Auth owns credentials**; `lib/auth.ts` maps the JWT to a Prisma `User` keyed by `auth.uid`. `User.password` is an unused legacy column. |
| Tenant isolation | **App-code only** — `where: { buildingId }` (Wall 3). RLS is bypassed (table-owner role). No DB safety net. |
| Region | Captured at signup → `signupExtras.region` persisted to `User` (`lib/auth.ts`). Not yet used for routing. |
| Payments | Stripe deps present, **not built for real**. UI only. |
| Audit | `logAuditFireAndForget` (`lib/audit`); `AuditLog` append-only via DB trigger. |
| Build/CI | `next build` passes (81 pages); CI now gates lint + typecheck + build. |

---

## 3. Target architecture

### 3.1 Tenant → datasource registry (the keystone)

Today `lib/prisma.ts` builds **one** PrismaClient from a single `DATABASE_URL`.
To support per-region DBs *and* bring-your-own DB, introduce a **tenant→datasource
resolver**:

```
request → resolve tenant (building/org) → look up datasource
        → { kind: "managed-regional", region } | { kind: "byo", connectionString (encrypted) }
        → get-or-create a pooled PrismaClient for that connection string (LRU cache)
        → run the query (Wall-3 buildingId predicate still required)
```

- A `Datasource` registry table (in a small **control-plane DB**) maps
  tenant → region / connection string. BYO connection strings stored
  **encrypted at rest** (app-level), decrypted only in memory.
- Per-connection PrismaClient cache keyed by connection string, bounded (LRU),
  so we don't exhaust connections. Serverless pooling matters here (see 3.3).
- **Invariant preserved:** the `where buildingId` predicate from
  [security-model.md](security-model.md) is still mandatory on every tenant query.
  The registry decides *which database*; the predicate still decides *whose rows*.

> Near-term simplification: ship with a single Canada datasource and the registry
> returning it for everyone. The abstraction lands now; multi-region/BYO turn on
> later without rewrites.

### 3.2 Authentication (Auth.js + argon2id)

- Replace `@supabase/ssr` + `supabase-js` session reads in `lib/auth.ts` with
  Auth.js. Keep `getOrCreateAppUser()`'s contract (returns `{ appUser, ... }`) so
  the ~45 capability call sites and three walls are untouched.
- **Credentials table** in the regional DB: `email`, `passwordHash` (argon2id),
  `emailVerifiedAt`, reset tokens (hashed, single-use, expiring).
- Re-implement: email verification, password reset, session cookies
  (httpOnly, Secure, SameSite=Lax), and the existing **impersonation** flow
  (`lib/impersonation-server`) on top of the new session.
- Drop or repurpose the legacy `User.password` column.

### 3.3 Hosting (Cloudflare)

- App is a **Node server** (Next 16 standalone, 17 API routes, Prisma) — not
  static. Use **`@opennextjs/cloudflare`** (Workers), not Cloudflare Pages.
- Prisma on Workers: use a driver adapter compatible with Workers
  (`@prisma/adapter-pg` over a pooled connection, or Neon's serverless driver).
  **Connection pooling is mandatory** on serverless — use Neon's pooled endpoint
  (PgBouncer) to avoid exhausting Postgres connections.
- Carry over security headers from `vercel.json` (HSTS etc.) to Cloudflare.
- Keep the `governance` cron (currently a Vercel cron) → Cloudflare Cron Trigger.
- **Rollback:** DNS-level. Keep Vercel deployable until Cloudflare is proven.

### 3.4 Region selection & residency

- Signup already collects region. Make it **authoritative**: on tenant creation,
  write a `Datasource` row pinning the tenant to its region's DB.
- Canada → `ca-central-1` Neon. Add US/EU/etc. as separate Neon projects when
  those markets open. Gov/enterprise → BYO datasource.

### 3.5 Payments (pluggable)

- Define a `PaymentProvider` interface; implement adapters per region
  (Stripe/Moneris/UPI/...). Tenant region (or building config) selects the adapter.
  Payments are per-building configurable (some buildings collect off-portal).
- **Never** store PANs/UPI VPAs/bank numbers — only processor tokens/refs.
  Keeps us out of PCI-DSS scope (SAQ-A) where possible.

---

## 4. Compliance checklist (PIPEDA + Quebec Law 25 + public sector)

Legend: ✅ have · ⚠️ partial · ❌ to build · 📄 policy/process (not code)

| # | Requirement | Status | Action |
|---|---|---|---|
| 1 | Data residency in Canada | ⚠️ | Neon `ca-central-1`; move auth off Supabase so creds are in-country too |
| 2 | Encryption at rest | ⚠️ | Neon default; add app-level field encryption for BYO conn strings + sensitive PII (licence/business #) |
| 3 | Encryption in transit (TLS/HSTS) | ✅ | Carry `vercel.json` headers to Cloudflare; enforce TLS to DB |
| 4 | Password hashing | ❌ | argon2id in new Auth.js layer (currently Supabase's job) |
| 5 | Access right (user can view/export their data) | ❌ | Build data-export endpoint on account page |
| 6 | Erasure right (delete my account/data) | ❌ | Build delete-account flow + cascade/anonymize |
| 7 | Consent at signup + privacy policy | ⚠️ | `/privacy` exists; add explicit consent capture + record of consent |
| 8 | Breach notification process | ❌ 📄 | Document: detect → assess "real risk of significant harm" → notify OPC + users |
| 9 | Audit logging of access/auth/payments | ✅ | `logAuditFireAndForget`; extend to auth + payment events |
| 10 | Tenant isolation (no IDOR) | ✅ | Wall-3 `where buildingId` invariant — keep through migration |
| 11 | Data minimization / retention | ⚠️ 📄 | Define retention windows; purge stale PII |
| 12 | Quebec Law 25: privacy officer, PIA, cross-border transfer assessment | ❌ 📄 | Name a privacy officer; do a PIA before launch; assess any non-Canada processing |
| 13 | Vendor/sub-processor list | 📄 | List Cloudflare, Neon, payment processors, email (Resend) + their regions |

---

## 5. Sequencing (proposed)

1. **Blueprint review** (this doc) — approve scope before code. ← we are here
2. **Datasource registry abstraction** (single Canada DB behind it). Low risk;
   no behavior change.
3. **Stand up Neon `ca-central-1`**, apply Prisma migrations (greenfield).
4. **Auth.js + argon2id** behind the existing `getOrCreateAppUser` contract.
   Cut over auth; retire Supabase.
5. **Cloudflare** via OpenNext; prove parity; flip DNS; keep Vercel as rollback.
6. **Compliance gaps** (export/erasure/consent/breach doc) — can parallel 3–5.
7. **Payments** abstraction + first regional adapter.
8. **Multi-region / BYO** turn-on when first non-Canada or enterprise tenant lands.

Each step is its own PR with the build-bulletproof CI gating it.

---

## 6. Open questions for the owner

- **Control-plane DB** location for the tenant→datasource registry (itself must be
  in a compliant region; Canada is safe).
- **Quebec Law 25 roles** — who is the designated privacy officer?
- **Payment processors** per launch region (Stripe vs Moneris for CA; UPI provider
  for India; rails for Russia).
- **BYO infra** support model — do we require Postgres-compatible only, or also
  managed offerings? What's the support boundary?
