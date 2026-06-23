# BuildingSync — naming & branding guidelines

> **Status:** DRAFT for review. Captures positioning + naming rules so product
> copy, the marketing site, and repo/package names stay consistent.

## 1. What BuildingSync is

BuildingSync is a **property-management platform focused on lowering the cost of
running a building**. It helps building managers and owners:

- analyze **power / energy consumption** and spot waste,
- compare **inflation against building-management expenses** over time,
- use technology so operating costs stay **flat or trend down over the years**,

while giving residents/tenants the day-to-day app (maintenance requests,
announcements, package pickup, amenity booking, rent & maintenance payments).

**One-line positioning:**
> BuildingSync keeps building costs from creeping up — energy analytics and
> expense intelligence that pay for themselves.

## 2. ⚠️ Critical disambiguation — we are NOT the DOE "BuildingSync"

There is a **US Department of Energy data standard** also called *BuildingSync®*
(an XML schema for building energy audit data, energy.gov/cmei). **We are
unrelated to it.** This matters for SEO, trademark, and not confusing buyers.

**Rules:**
- Never describe our product as "the BuildingSync schema/standard" or imply
  affiliation with DOE / national labs.
- In ambiguous contexts (energy, audits), add a qualifier:
  *"BuildingSync — the property-management platform"* or use the full product
  name + tagline.
- Legal/trademark review recommended before heavy energy-sector marketing, since
  the name collides in exactly that vertical. Consider a distinctive wordmark +
  always-on tagline to separate the brands. (Flag for owner: confirm trademark
  posture.)

## 3. Name usage

- **Product name:** *BuildingSync* (one word, camel-case B and S). Not
  "Building Sync", "BuildSync", or "Buildingsync".
- **Domain:** buildingsync.app
- **Wordmark:** see `components/ui` `Wordmark`. Keep consistent casing.

## 4. Tagline options (pick one, use consistently)

- "Building costs, under control."
- "Run your building for less, every year."
- "Energy and expense intelligence for buildings."

## 5. Voice & tone

- **Plain, concrete, money-aware.** Lead with savings and clarity, not jargon.
- Resident-facing copy is warm and simple; manager/owner-facing copy is
  data-driven and ROI-focused.
- Avoid energy-standards jargon that invites confusion with the DOE schema.

## 6. Naming carries into code (see ARCHITECTURE-MIGRATION + rename task)

- npm package: `buildingsync-app` (this repo). Keep `buildingsync-*` prefix for
  sibling packages.
- GitHub org `BuildingAi-Cloud` is slated to be renamed to something less generic
  and on-brand (owner to choose). Repos should follow `BuildingSync-*`.
