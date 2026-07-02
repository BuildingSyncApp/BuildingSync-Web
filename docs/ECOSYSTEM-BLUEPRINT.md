# Ecosystem blueprint — AppFolio-shaped, BuildingSync-built

Node2.io positioning: BuildingSync mimics the *shape* of the category leader's
ecosystem (personas, portals, product areas) while staying legally clean and
honest about being an R1-stage product.

## Legal guardrails (apply to every page and feature)

1. **Patterns ≠ property.** Feature sets, workflows, IA, and UX concepts are
   not protectable. Copying *text, images, CSS, logos, or screenshots* is.
   Everything here is built with our own copy and the BuildingSync design
   language (paper/light/dark, mono eyebrows, bordered cards).
2. **Trademark:** "AppFolio" may appear only in truthful comparative contexts
   (e.g. the pricing comparison), never in a way that implies affiliation.
3. **No over-promising:** "SLA" only where a paid contract exists. Disclose,
   don't promise (see /terms + /security tier table). R1 copy stays inside
   what the product actually does today.

## The map: AppFolio surface → BuildingSync

| AppFolio area | BuildingSync equivalent | Status |
|---|---|---|
| PM dashboard (move-ins/outs, portfolio summary) | /team command-center (occupancy, rent MTD, work queue, needs-attention) | ✅ R1 (2026-07-01) |
| Maintenance + AI triage | /team/work-orders + AI triage banner | ✅ R1 |
| Resident portal | /dashboard (4-zone home, payments, amenities, packages) | ✅ R1, polish ongoing |
| Communication (announcements, targeted audiences) | /team/announcements + push + email | ✅ R1 |
| Leasing (rent roll, renewals) | Leases on /team/residents; renewal advisories | ✅ basic R1 → R2 (renewal workflows) |
| Accounting & reporting | Payments (Stripe-gated) + CSV trails | R2 — needs Stripe onboarding + reporting surfaces |
| Marketing & leasing funnel (listings, screening) | Not built | R3 candidate |
| Owner portal (investor-facing dashboards) | /owner — read-only overview (occupancy, collections MTD/YTD, ops) for role `building_owner`; statements/expense breakdowns R2 | ✅ seeded R1 (2026-07-01) |
| Vendor portal | vendorId exists on WorkOrder; no portal | R2/R3 |
| Realm-X AI assistant | /ai-assistant (announced "soon") + per-surface AI (triage, drafts) | R1 seeds → R2 |
| Integrations marketplace | /integrations (fob/camera/network tie-ups) | R2 |
| Multi-vertical (HOA, student, commercial) | Residential ON first; verticals later | R3 |
| Unified accounts / multi-building | buildingId scoping exists; org layer missing | R2 (org/portfolio model) |

## Marketing-site IA (theirs → ours, original execution)

AppFolio: Products (by function) · Why · Resources · Pricing · Demo CTA · per-persona logins.
BuildingSync today already mirrors the essentials: /for-property-managers,
/enterprise, /integrations, /pricing (transparent vs. their quote-only — our
wedge), /walkthrough (demo CTA), /signin per role. Gaps worth closing in R2:
customer stories, a resources/insights section, and a public status page.

## Portal parity checklist

- [x] Staff portal (/team) — persona-tuned homes: BM (money+portfolio), FM (work queue + amenities), concierge (front desk)
- [x] Staff amenities surface (/team/amenities) — read-only R1; slot blocking/cancel R2
- [x] Resident/tenant portal (/dashboard)
- [x] Owner/investor portal (/owner) — read-only R1
- [x] Platform admin (/platform) with impersonation ("View as")
- [ ] Vendor portal — R2/R3
- [x] Role advisories (rotating banner) — team ✅, resident ✅

## Onboarding & governance notes (owner directives, 2026-07-01)

- Resident/tenant/owner onboarding must support BOTH intake modes per
  building: office/paper form (staff creates the account, invite email)
  and self-serve digital (invite code / QR at /signup?code=…). Neither
  is universal — follow how the building already operates.
- E-governance (notices, processes) defaults come from the building's
  province/location law. A BM may take an exception path, but the
  exception itself must remain lawful — record overrides in the audit
  log; never let an override silently bypass a legal requirement.
