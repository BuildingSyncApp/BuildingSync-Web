# BuildingSync — R1 (Website-Beta)

Production launch repo. Next.js 16 + Supabase + Prisma + Stripe Checkout, deployed on Vercel.

> R&D and phased development happens in `BuildingAi-Cloud/super-octo-rotary-phone`. This repo is the narrow production cut. Port forward; don't bidirectional-merge.

## Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Auth + DB**: Supabase (SSR auth, Postgres)
- **ORM**: Prisma 7
- **Payments**: Stripe Checkout
- **PWA**: manifest + service worker (installable)
- **Deploy**: Vercel

## Domains

- `buildingsync.app` — marketing + resident/tenant portal
- `admin.buildingsync.app` — building manager / facility manager / concierge
  (same Next.js deployment, subdomain rewrite in `proxy.ts`)

## Quick start

```bash
cp .env.example .env.local   # fill Supabase + Stripe keys
npm install
npx prisma migrate dev       # apply schema to Supabase
npm run dev                  # http://localhost:3000
```

## R1 scope

Resident/tenant: sign in · maintenance request · announcements · pay rent (Stripe Checkout).
Admin: BM roster + invite, FM work-order queue, Concierge package log.
PWA: installable on mobile.

Out of R1 (lives in R&D): AI chat, governance, vendor portal, owner banks, OCR, marketplace, audit log UI, i18n, Stripe Connect.
