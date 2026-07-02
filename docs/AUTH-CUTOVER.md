# Auth cutover: fix broken login (off Supabase → own argon2id auth)

**Status as of 2026-07-01:** Root-caused, fixed on a branch, and **proven working
locally**. Not yet merged, not yet deployed. This doc is the runbook to finish it.

---

## Why login is broken on buildingsync.app today

The live site runs `main`. On `main`, authentication is **100% Supabase Auth**:

- `app/signin/page.tsx` → `supabase.auth.signInWithPassword(...)`
- `lib/auth.ts` → `supabase.auth.getUser()` (imports `@supabase/supabase-js`)
- `utils/supabase/server.ts` requires `NEXT_PUBLIC_SUPABASE_URL` +
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (non-null asserted)

Supabase is being decommissioned (it was beta-only). With the Supabase project
gone / keys unset on Vercel, every `signInWithPassword` call fails — the signup
and signin **forms render**, but there is no working auth backend behind them.
That is the entirety of "login isn't working."

> Note: `/login` returns 404 because the route is `/signin`. That is **not** the
> bug — it's a different path, unrelated to the auth failure.

## The fix already exists — on `feat/me-api-routes`

That branch replaces Supabase Auth with our own:

| File | What it does |
|---|---|
| `lib/auth-core.ts` | argon2id `hashPassword`/`verifyPassword`; HMAC-SHA256 signed session + action tokens |
| `lib/session.ts` | httpOnly/secure/lax `bsync_session` cookie via `next/headers` |
| `lib/auth-actions.ts` | `registerUser`, `loginUser`, `logoutUser`, `requestPasswordReset`, `setPasswordWithToken`, `provisionUserWithInvite` |
| `lib/auth.ts` | now reads our own session; returns local `SessionUser = {id,email}` |
| `app/signin/page.tsx` | calls `loginUser()` — no Supabase |
| `utils/supabase/*` | **deleted** |

Requires only these env vars for the auth path: `AUTH_SECRET` (≥32 chars),
`DATABASE_URL`, `APP_BASE_URL`, `NODE_ENV`. Supabase env vars are gone.

## Proven locally (2026-07-01)

Wired `DATABASE_URL` to the **Dockerized Postgres on :5433** (Colima container
`bsync-test-db`, auto-updated by `bsync-watchtower`; DB `buildingsync_dev`, user
`bsync`). Schema was already migrated (`20260508110000_init`); `prisma migrate
status` = "up to date". Ran the real `registerUser` + `loginUser` against it:

- signup writes an **argon2id** hash (`$argon2id$…`, never plaintext)
- login verifies the hash and issues a valid, signed `bsync_session` cookie
- wrong password → rejected, no cookie
- **zero `@supabase` in the loaded module graph**
- committed auth test suite: **15 pass / 0 fail**; `npm run typecheck`: clean

## Merge readiness

- `feat/me-api-routes` is **13 commits ahead of `main`, 0 behind** → clean merge,
  no conflicts (`git merge-tree` dry-run: none).
- Branch tip (2026-06-24) is newer than `main` tip (2026-06-22).

## To finish (owner-run; do NOT let CI auto-deploy until step 4 verified)

1. **Merge** `feat/me-api-routes` → `main` (PR). CI (`prisma generate && lint &&
   typecheck && build`) must be green.
2. **Provision the cloud DB (Neon, ca-central-1).** Get two connection strings:
   - `DATABASE_URL` = pooled (`:6543`, `pgbouncer=true`) for runtime
   - `DIRECT_URL` = direct (`:5432`) for `prisma migrate`
3. **Apply migrations to Neon:** `DIRECT_URL=<neon-direct> npx prisma migrate deploy`.
4. **Set Vercel env** (Production + Preview): `AUTH_SECRET` (fresh 48-byte
   base64url — do **not** reuse the local one), `DATABASE_URL`, `DIRECT_URL`,
   `APP_BASE_URL=https://www.buildingsync.app`, `IMPERSONATION_SIGNING_SECRET`.
   **Remove** the stale `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY`.
5. **Smoke test on a Preview deployment** first: signup → login → session persists
   → logout. Only then promote to Production.

### Local → cloud is an env-only swap

Nothing in code changes between local and Neon. Point `DATABASE_URL`/`DIRECT_URL`
at Neon and the same proven auth path runs. Keep the Docker :5433 DB as the local
dev/test target.

## Rollback

If a Preview smoke test fails, do not promote. Because the merge is additive auth
logic (Supabase files deleted, own auth added), reverting the merge commit returns
to the current (broken-but-known) `main`. The safer path is to fix forward on a
Preview — production is unaffected until you promote.

## Existing users

`main` users live in Supabase Auth; their password hashes are **not** in our
Prisma `User.password`. After cutover, existing users must use **password reset**
(`requestPasswordReset` → `setPasswordWithToken`) to set a password in the new
system, or be re-provisioned via invite. Flag this in launch comms.
