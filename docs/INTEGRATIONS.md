# Integrations & device / API management strategy

> **Status:** PLANNING / roadmap. Captures the vendor-integration surface,
> device & firmware management approach, the API-management plan, and the
> zero-cost migration promise. Buildings frequently arrive with hardware and
> tools already installed — BuildingSync must *adopt* that setup, not require
> a rip-and-replace.

Foundation that already exists in the repo:
- **OpenAPI spec** served at `/api/openapi` (`public/openapi.yaml`) — the seed of
  API management + partner docs.
- R&D schema reserved (currently unmodeled) tables: `Integration`, `Device`,
  `VendorAccess`, `Telemetry`, `Alert`, `GuestVisit` — device/vendor support was
  designed for from the start.
- Enterprise tier already markets SSO + custom API integrations + webhooks.

---

## 1. Why this matters (sales reality)

Most buildings of 20–400 units already run **some** hardware/software: a fob
access system, cameras at the entrances, a router/firewall the property manager
inherited. "Does it work with what we already have?" is a top objection. An
integration layer turns that objection into a differentiator.

---

## 2. Vendor categories & candidate tie-ups

> Integration *depth* varies by vendor: **API** (real-time, two-way) > **webhook**
> (events in) > **CSV/import** (one-time) > **SSO/SCIM** (identity only). Start
> with the vendors that expose a documented cloud API.

### 2.1 Access control / key fobs / smart locks
| Vendor | Why | Integration surface |
|---|---|---|
| **Kisi** | Cloud-first, strong REST API + webhooks | API, webhooks |
| **Brivo** | Large installed base in multifamily | REST API |
| **SALTO / SALTO KS** | Popular EU + condo locks | KS API |
| **Genea** | Cloud access, API-friendly | REST API |
| **Latch / Latch (Door)** | Multifamily smart entry | Partner API |
| **ButterflyMX** | Video intercom + access (multifamily staple) | API / webhooks |
| **Verkada (Access)** | Unified access+camera | REST API |
| **HID / Openpath (Avigilon Alta)** | Enterprise access | Alta API |

**Use cases:** auto-provision/deprovision fob credentials when a resident is
onboarded/offboarded in BuildingSync; log door events into the audit trail;
issue temporary guest access tied to `GuestVisit`.

### 2.2 Security cameras / VMS
| Vendor | Why | Integration surface |
|---|---|---|
| **Verkada** | Cloud VMS, clean API, multifamily traction | REST API + webhooks |
| **Rhombus** | Cloud-native cameras, good API | REST API |
| **Eagle Eye Networks** | Cloud VMS, open API | API |
| **Avigilon / Ava (Motorola)** | Enterprise + cloud | Alta/Ava API |
| **Camio / Spot AI** | AI video alerts | Webhooks |

**Use cases:** attach a camera clip/snapshot to an incident report; surface
entrance events; alert the concierge on motion at off-hours. Keep video *links*,
never store footage (PII + storage + liability).

### 2.3 Network / cybersecurity & connectivity
| Vendor | Why | Integration surface |
|---|---|---|
| **Ubiquiti UniFi** | Ubiquitous in MDU/condo | Controller API (local/cloud) |
| **Cisco Meraki** | Cloud-managed, strong dashboard API | REST API + webhooks |
| **Fortinet (FortiGate)** | Firewall/SMB security | FortiOS API |
| **Cloudflare Zero Trust** | We're already moving to Cloudflare | API |
| **Tailscale** | Simple mesh for on-prem device reach | API |

**Use cases:** health/status of building network; secure tunnel to reach on-prem
devices for the BYO-infra tenants; surface security alerts as `Alert` records.

### 2.4 Adjacent (worth listing for completeness)
- **Smart thermostats / energy:** ecobee, Honeywell, Flair — ties to the
  cost-saving/energy positioning in [BRANDING.md](BRANDING.md).
- **Package/parcel:** Luxer One, Position Imaging, Snaile (Canada) — feeds the
  existing `Delivery` model.
- **Payments:** Stripe (have), Moneris (CA), Razorpay/UPI (India) — see the
  pluggable payments note in [ARCHITECTURE-MIGRATION.md](ARCHITECTURE-MIGRATION.md).
- **Accounting/PM:** Yardi, AppFolio, Buildium — import/export, not deep API.

---

## 3. Integration patterns (how we connect)

1. **Outbound API client per vendor** — a thin adapter implementing a common
   `Integration` interface (`connect`, `sync`, `provisionCredential`,
   `revokeCredential`, `listEvents`). Mirrors the pluggable-payments adapter idea.
2. **Inbound webhooks** — `/api/integrations/<vendor>/webhook` endpoints,
   signature-verified, writing normalized events to `Alert` / audit log.
3. **Identity** — SCIM / SSO (SAML/OIDC) for enterprise so user lifecycle drives
   access systems automatically.
4. **IoT / devices** — for low-level hardware, an **MQTT** broker or vendor cloud;
   normalize readings into `Telemetry`.
5. **Per-tenant config** — which integrations a building has, plus encrypted
   credentials, live in the `Integration` table keyed by `buildingId` (reuse the
   tenant→datasource pattern; secrets encrypted at rest).

---

## 4. Device & firmware management

For buildings that want BuildingSync to help manage devices (not just talk to a
vendor cloud):

- **Inventory** — model `Device` (type, vendor, location, firmware version,
  last-seen, health) per building.
- **Firmware posture** — record current vs. latest firmware; flag out-of-date or
  end-of-life devices as `Alert`s. *Pushing* firmware is vendor-specific and
  high-risk — prefer surfacing status + deep-linking to the vendor's updater
  over BuildingSync directly flashing firmware (liability, bricking risk).
- **Remote reach** — for on-prem/BYO tenants, use a secure tunnel (Tailscale /
  Cloudflare Tunnel) rather than opening inbound ports.
- **OTA only where the vendor supports it** and the customer explicitly opts in,
  with a full audit trail.

> Recommendation: position firmware as **monitoring + advisory** first
> ("3 devices need updates"), add actual OTA per-vendor later. Don't promise
> universal firmware management — it's vendor-fragmented.

---

## 5. API management (turning the OpenAPI spec into a platform)

- Publish the existing `public/openapi.yaml` as **partner API docs**.
- **API keys / OAuth clients** per integration partner + per building, scoped and
  revocable; rate-limited; every call audit-logged.
- **Webhook subscriptions** managed in `/platform` (and per-building settings).
- Versioned, backward-compatible API; deprecation policy.

---

## 6. Zero-cost migration / onboarding

Promise: **if a building's existing setup is simple, migration and initial setup
cost is $0.** Concretely:

- The existing **free 90-day pilot + white-glove setup** already covers this for
  the first buildings — fold "we import your existing data and connect your
  existing fob/camera vendor at no setup fee" into that offer.
- Provide **self-serve importers** (CSV resident/unit import already exists) and
  vendor "connect" flows so simple migrations need no professional services.
- Reserve paid onboarding for genuinely complex cases (custom integrations,
  on-prem, bespoke data shapes). Make the line explicit on the pricing page so
  it's credible, not a hidden gate.

---

## 6a. AI-native layer (capability-based, variable pricing)

BuildingSync is positioned as an **AI-native application**: AI is not one flat
baked-in feature but a **configurable, metered layer** turned on per customer
based on need — and **priced accordingly** (usage / capability tiers).

**Already in the repo:** `@anthropic-ai/sdk` + `lib/anthropic.ts` (lazy client,
build-safe when no key), and two live AI routes — `app/api/ai/draft-announcement`
and `app/api/ai/work-order-triage`. Use the **latest, most capable Claude models**
by default.

**Make AI a pluggable, metered capability:**
- A per-building **AI config** (which AI features are enabled) alongside the
  `Integration` config — same pattern as vendor integrations.
- **Usage metering** (tokens / requests / feature) recorded per building (reuse
  the R&D `AiUsage` concept) → drives variable billing.
- **Capability tiers**, e.g.:
  - *Assist* (included/low): announcement drafting, work-order triage (have).
  - *Insight* (mid): summarize an incident thread, semantic search across a
    building's history, anomaly/cost alerts (ties to the energy/cost-saving
    positioning in [BRANDING.md](BRANDING.md)).
  - *Agentic* (high/usage-priced): multi-step workflows — draft + route + follow
    up; vendor-dispatch suggestions; natural-language reporting.
- **Customer-need driven:** enable only what a building asks for; price scales
  with capability + usage rather than a single flat AI fee.
- **Privacy/residency:** AI calls must respect data residency
  ([ARCHITECTURE-MIGRATION.md](ARCHITECTURE-MIGRATION.md)); don't send tenant PII
  to a model region that violates the building's residency choice. Offer a
  no-AI / on-prem-model option for gov/strict tenants (the repo already has an
  Ollama/local-provider concept in the R&D lineage).

> This pairs with regional pricing: the base per-unit price stays simple; AI is a
> separate, transparent, usage-based add-on so customers only pay for the AI they
> actually use.

## 7. Proposed roadmap placement

| Phase | Integration scope |
|---|---|
| **Now (R1/R2)** | OpenAPI docs public; CSV import; design `Integration`/`Device` models; pick 1 access + 1 camera + 1 network launch partner (suggest **Kisi + Verkada + UniFi/Meraki**). |
| **R2→R3** | First live adapters (provision/deprovision fob on onboarding; incident↔camera clip; network/alert surfacing). Webhook framework + signature verification. SSO/SCIM for enterprise. |
| **R3+** | Device inventory + firmware advisory; OTA per-vendor opt-in; partner API keys/marketplace; IoT/MQTT telemetry. |

---

## 8. Open questions for the owner

- Which **launch partners** to approach first (suggest Kisi, Verkada, UniFi/Meraki
  — all API-friendly with multifamily traction)?
- Do we want a **public "Integrations" marketing page** now (even "coming soon /
  request an integration") to capture the prior-setup objection in sales?
- For firmware: **advisory-only** (recommended) or commit to OTA for specific
  vendors?
- Should integrations be an **Enterprise-tier** feature, or available (metered) on
  lower tiers?
