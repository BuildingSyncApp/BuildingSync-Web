# Move fully off Supabase: own auth + Cloudflare R2 storage

Removes Supabase from the application entirely. Auth and document storage —
the two things still tied to Supabase — are reimplemented as first-party
code, and the `@supabase/*` dependencies are dropped.

## Why
Supabase was a beta-only instance with no production data. The product
direction is a cost-controlled, data-residency-aware stack (managed Postgres
in `ca-central-1` + own auth). This PR makes the codebase Supabase-free so the
DB can move to Neon and the project can deploy without a Supabase dependency.

## What changed

### 1. Authentication → own argon2id + signed sessions (`9ee820d`)
- `lib/auth-core.ts` — argon2id password hashing; HMAC-SHA256 signed session
  tokens (30d) and one-shot action tokens (reset 1h / invite 7d). Mirrors the
  existing `lib/impersonation` token idiom — **no NextAuth/JWT dependency**,
  only `argon2` added. Action tokens bind to the user's current password hash,
  so a reset/invite link is single-use by construction.
- `lib/session.ts` — httpOnly/secure/lax session cookie helpers.
- `lib/auth-actions.ts` — `registerUser`, `loginUser`, `logoutUser`,
  `requestPasswordReset`, `setPasswordWithToken`, `provisionUserWithInvite`.
- Rewired every Supabase Auth callsite: signup/signin/reset pages,
  `/auth/signout`, `/auth/callback`, home page, onboarding + account password
  flows, team resident/staff provisioning, and the admin/seed scripts.
- `lib/auth.ts` / `lib/api-auth.ts` now read our own session (cookie + mobile
  Bearer use the same signed token); `authUser` is a local `SessionUser`.
- Team provisioning now emails a **set-password invite link** instead of a
  temp password (forms updated to match).
- `proxy.ts` no longer refreshes a Supabase session; `utils/supabase/*` deleted.

**Behavioural notes for reviewers:**
- `User.id` is now an app-minted uuid (was the Supabase auth.uid). Greenfield
  DB, so no migration of existing ids is needed.
- Login is timing-safe and returns a generic error (no account enumeration);
  password reset returns a uniform response regardless of account existence.

### 2. Document storage → Cloudflare R2 (`a853d7e`)
- `lib/storage.ts` — S3-compatible R2 client (`putObject` / `deleteObject` /
  presigned `getDownloadUrl`) via `@aws-sdk/client-s3` + `s3-request-presigner`.
- `app/team/documents/actions.ts` rewired to it; the upload orphan-cleanup,
  auth checks, audit logging, and the UI download contract are unchanged.
- Chosen for cost: R2 has free egress + a 10 GB / 1M-writes free tier (covers
  the document workload at current scale) and a selectable bucket region for
  residency. Removes the last `@supabase/*` usage.

### 3. Security tests + CI (`0c4b735`)
- `test/auth-core.test.ts` — 15 tests on the crypto core proving the security
  properties: argon2id round-trip + wrong-password rejection; session token
  tamper/forgery/expiry rejection; action-token single-use binding.
- `node:test` via the already-present `tsx` — **zero new test deps**.
  `test/setup-server-only-stub.mjs` neutralises the `server-only` build guard
  for the test runtime.
- Added `npm test` and wired it into `npm run ci`.

## Gates
Full CI green locally: `prisma generate` · `lint` (0 errors) · `typecheck` ·
`test` (15/15) · `build`.

## NOT covered / follow-ups
- **No live-DB run yet.** All gates are static + crypto-unit. The DB-touching
  actions (`registerUser`/`loginUser`/etc.) and R2 upload/download have not
  been exercised against a real database/bucket. Integration tests that run
  against a test Postgres are a follow-up (they skip when `DATABASE_URL` is
  unset so CI stays green without a DB).
- **MFA** is referenced as "on the roadmap" on the security page; not built.
- Stale `.mcp.json` still points at the old Supabase `project_ref`.

## Owner-side deploy checklist (see `docs/NEON-MIGRATION-RUNBOOK.md`)
1. Create Neon project in `ca-central-1`; set `DATABASE_URL` + `DIRECT_URL`;
   run `prisma migrate deploy`.
2. Set `AUTH_SECRET` and `IMPERSONATION_SIGNING_SECRET`
   (`openssl rand -base64 48`) in Vercel.
3. Create the R2 bucket + API token; set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
4. Bootstrap the first admin: `npx tsx scripts/create-admin.ts <email> <pw>`.
5. Smoke-test the auth + document flows (runbook §6 / §5b).
6. Remove all `SUPABASE_*` env vars from Vercel; archive the Supabase project.
