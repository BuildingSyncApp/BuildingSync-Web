# Neon setup runbook (fresh start on Neon)

> Stand up BuildingSync's database on **Neon Postgres in `ca-central-1`**
> (Canadian data residency). **Supabase was only a throwaway test instance —
> there is NOTHING to migrate.** This is a clean greenfield setup: create the
> DB, apply the schema, point the app at it. No data export/import, no cutover,
> no rollback-to-Supabase to worry about. Commands are run by the owner with
> their own credentials; **no secret ever goes into the repo.**

## 0. Security first (do this once)
- If a Neon connection string was ever pasted into a chat / ticket / log,
  **rotate it**: Neon Console → your project → **Roles** → reset the role
  password (or **Connection Details → Reset password**). Use the new string
  everywhere below.
- Secrets live in: a local **`.env`** (gitignored — never committed; the repo's
  `.github/workflows/guard.yml` blocks committing `.env*`), and **Vercel →
  Project → Settings → Environment Variables**. Never in code or `app.json`.

## 1. Create the Neon project in Canada
1. Neon Console → **New Project**.
2. Region: **AWS `ca-central-1` (Canada Central)** — required for the PIPEDA /
   Law-25 residency posture. (A `us-east-1` instance does **not** satisfy this.)
3. Postgres 16+.
4. From **Connection Details**, copy **two** URLs:
   - **Pooled** (host contains `-pooler`) → app runtime (serverless-friendly).
   - **Direct** (no `-pooler`) → migrations / DDL.

## 2. Local env
Create `.env` (and `.env.local`) in the web repo — gitignored:
```
# App runtime (pooled). Prisma's pg adapter uses this.
DATABASE_URL="postgresql://<user>:<pw>@<host>-pooler.ca-central-1.aws.neon.tech/neondb?sslmode=require"
# Migrations / DDL (direct, non-pooled).
DIRECT_URL="postgresql://<user>:<pw>@<host>.ca-central-1.aws.neon.tech/neondb?sslmode=require"
```
`prisma.config.ts` already reads `DIRECT_URL ?? DATABASE_URL`, and
`lib/prisma.ts` uses `DATABASE_URL` via `@prisma/adapter-pg` — no code change
needed.

## 3. Apply the schema (greenfield)
From the web repo, with the `.env` above loaded:
```bash
npx prisma generate
# Apply ALL migrations to the empty Neon DB:
npx prisma migrate deploy
```
This creates every table including the three recent additions:
`ContactSubmission` (PR #42), `AiUsage` (PR #48), `Policy` (PR #50).

Verify:
```bash
npx prisma migrate status      # should report "Database schema is up to date"
npx prisma studio              # eyeball the tables
```

## 4. Point production at Neon
In **Vercel → Settings → Environment Variables** (Production scope):
- `DATABASE_URL` = pooled Neon URL
- `DIRECT_URL` = direct Neon URL
- `AUTH_SECRET` = `openssl rand -base64 48` (signs sessions + action links)
- `IMPERSONATION_SIGNING_SECRET` = `openssl rand -base64 48` (admin "View as")
Redeploy. The app now reads/writes Neon and runs its own auth.

> Since Supabase was only a test instance, you can delete its **auth** env
> vars right away — there's no data or sessions worth keeping a rollback path
> for. Keep the Supabase keys ONLY if you still use Supabase Storage for
> documents (see §5), until that's migrated too.

## 5. Auth — DONE (own auth, argon2id + signed sessions) ✅
Auth has been **fully migrated off Supabase Auth.** Credentials live in the
Neon `User.password` column hashed with **argon2id**; sessions are stateless
**HMAC-signed cookies** (`lib/auth-core.ts` + `lib/session.ts`, mirroring the
existing `lib/impersonation` token idiom — no NextAuth/JWT dependency added).

What changed:
- `lib/auth-actions.ts` — register / login / logout / password-reset /
  set-password-invite server actions.
- `lib/auth.ts` + `lib/api-auth.ts` — read our own session (cookie + mobile
  Bearer = the same signed token).
- Signup/signin/reset pages, `/auth/signout`, onboarding + account password
  flows, and team resident/staff **provisioning** (now an emailed
  set-password invite link, not a temp password) all use own auth.
- `utils/supabase/{server,client,middleware}.ts` deleted; `proxy.ts` no
  longer refreshes a Supabase session.

Required new secrets: **`AUTH_SECRET`** and **`IMPERSONATION_SIGNING_SECRET`**
(see §4 and `.env.example`).

> ✅ Storage is also off Supabase: **document file storage** now uses
> **Cloudflare R2** (`lib/storage.ts`). `@supabase/*` deps are removed — the
> app no longer touches Supabase at all. See §5b for R2 setup.

## 5b. Object storage (Cloudflare R2)
Document uploads/downloads use R2 (S3-compatible, free egress, region-
selectable). One-time setup in the Cloudflare dashboard:
1. **R2 → Create bucket** (e.g. `buildingsync-documents`). Pick the region
   for residency.
2. **R2 → Manage R2 API Tokens → Create** (Object Read & Write, scoped to
   the bucket). Copy the **Access Key ID** + **Secret Access Key**, and note
   your **Account ID**.
3. Set in `.env` (local) and **Vercel → Production**:
   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
4. Smoke-test: upload a document in `/team/documents`, download it, delete
   it. Confirm the object lands in the R2 bucket.

## 6. Smoke test
- `npm run build` locally against Neon `.env` → green.
- Exercise the own-auth flows end to end:
  - **Sign up** at `/signup` → creates a `User` row (argon2id hash) and lands
    you signed-in. Confirm the row in `prisma studio`.
  - **Sign out** (`/auth/signout`) → **sign in** at `/signin`.
  - **Forgot password** → email link → `/auth/reset?token=…` sets a new hash.
  - As a BM, **add a resident/staff** → confirm a passwordless `User` row + a
    set-password invite email (Resend); follow the link to activate.
- Then exercise data writes: submit a contact form (`ContactSubmission`), run
  an AI feature (`AiUsage`), create a policy (`Policy`). Confirm in Neon.

## 7. Decommission Supabase
**Done in code:** auth (§5) and storage (§5b) are both off Supabase, and the
`@supabase/*` dependencies + `utils/supabase/*` are removed. The app no
longer references Supabase anywhere.

To finish on the infra side:
- Remove all `SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*` env vars from Vercel +
  local `.env`.
- Archive (or delete) the Supabase project once you've confirmed nothing
  external still points at it.

## Rollback
N/A in any meaningful sense — Supabase held only throwaway test data, so there
is nothing to roll back *to*. If a Neon migration step fails, fix the schema/env
and re-run `prisma migrate deploy` against the (still empty) Neon DB.
