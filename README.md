# BuildingSync

[![CI](https://github.com/BuildingSyncApp/BuildingSync-Web/actions/workflows/ci.yml/badge.svg)](https://github.com/BuildingSyncApp/BuildingSync-Web/actions/workflows/ci.yml)

**The everyday app for residential buildings.**

Residents report maintenance, read building announcements, pick up packages, book
the party room, and pay rent — all in one place. Building staff, owners, and
managers each get their own view of the same building.

→ **[www.buildingsync.app](https://www.buildingsync.app)**

## What's in the app

| For residents and tenants | For building staff |
| --- | --- |
| Report a maintenance problem and track it to resolution | One queue of every open work order, most overdue first |
| Get building announcements in the app and by email | Post announcements to everyone, only tenants, or specific units |
| Pickup codes for packages waiting at the front desk | Log packages in one tap and auto-notify the recipient |
| Book the party room, BBQ, gym, or guest suite | See the full booking schedule and prevent double-bookings |
| Pay rent online — or the office records e-transfer/cheque | Collections tracking either way; no forced card fees |
| Find building documents — bylaws, fire plans, rules | Upload and manage building documents |
| See community events and RSVP | Plan and post events; track who's coming |

Every role gets a tailored home: residents and tenants (`/dashboard`), concierge,
facility managers, and building managers (`/team`), building owners (`/owner`,
read-only investment view), and platform admins (`/platform`). Works on phones,
tablets, and computers — installable as a PWA, accessible by default with
large-text and reduced-motion modes built in.

## Pricing

Free for residents. Buildings pay $2.50 per unit per month, with the first 90
days free. Enterprise and on-premise options are available for larger portfolios
and government / healthcare deployments.

→ [Details for property managers](https://www.buildingsync.app/for-property-managers)

## For developers

Next.js (App Router) · TypeScript · Tailwind CSS · Prisma / PostgreSQL ·
own auth (argon2id + signed sessions) · Cloudflare R2 storage · Vercel.

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, AUTH_SECRET (see the template)
npx prisma migrate deploy   # or point DATABASE_URL at a local Postgres first
npx tsx prisma/seed.ts      # demo building, units, amenities, sample data
npm run dev                 # http://localhost:3000
```

Checks: `npm run ci` runs the full pipeline (Prisma generate → ESLint →
TypeScript → tests → build). CI enforces it on every push.

Key docs live in [`docs/`](docs/):

- [`ARCHITECTURE-MIGRATION.md`](docs/ARCHITECTURE-MIGRATION.md) — target infrastructure blueprint
- [`ECOSYSTEM-BLUEPRINT.md`](docs/ECOSYSTEM-BLUEPRINT.md) — product map and R1→R3 staging
- [`AUTH-CUTOVER.md`](docs/AUTH-CUTOVER.md) — auth root-cause and deploy runbook
- [`security-model.md`](docs/security-model.md) + [`SECURITY.md`](SECURITY.md) — security posture and disclosure policy

## About

BuildingSync is built in Canada by [Node2.io](https://node2.io). All rights
reserved; this repository is source-visible for transparency, not open source.

- **Help Centre** — [www.buildingsync.app/docs](https://www.buildingsync.app/docs)
- **Contact** — [info@buildingsync.app](mailto:info@buildingsync.app)
