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
Redeploy. The app now reads/writes Neon.

> Since Supabase was only a test instance, you can delete its env vars right
> away — there's no data or sessions worth keeping a rollback path for.

## 5. Auth — the separate, bigger piece ⚠️
The DB move alone does **not** move auth. Today `lib/auth.ts` relies on
**Supabase Auth** for credentials/sessions. Moving fully off Supabase means
building our own auth (**Auth.js / NextAuth + argon2id**) against the Neon
`User` table. That's its own workstream (see the architecture migration plan).
**Sequence:** land the DB on Neon first (data layer works via Prisma), then cut
over auth. Until auth is migrated, you can run Prisma against Neon while auth
still points at Supabase — but that's a transitional state, not the end goal.

## 6. Smoke test
- `npm run build` locally against Neon `.env` → green.
- Exercise: sign in, load a dashboard, submit a contact form (writes
  `ContactSubmission`), run an AI feature (writes `AiUsage`), create a policy
  (writes `Policy`). Confirm rows land in Neon (`prisma studio`).

## 7. Decommission Supabase
Once production is stable on Neon and auth is migrated:
- Remove Supabase env vars from Vercel + local.
- Remove `@supabase/*` deps and the `utils/supabase/*` code in a dedicated PR.
- Archive the Supabase project.

## Rollback
N/A in any meaningful sense — Supabase held only throwaway test data, so there
is nothing to roll back *to*. If a Neon migration step fails, fix the schema/env
and re-run `prisma migrate deploy` against the (still empty) Neon DB.
