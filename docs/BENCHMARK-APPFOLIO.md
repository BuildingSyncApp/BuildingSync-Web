# Benchmark vs AppFolio — what it takes to make BuildingSync "absolute"

> **Status:** strategic gap analysis. Benchmarks BuildingSync's *current* state
> against AppFolio (a mature, full-stack property-management platform) and lays
> out what's needed to reach business-grade parity. AppFolio is a useful north
> star, but note BuildingSync's deliberate wedge (Ontario/Canada residential,
> audit-grade, AI-native) — we don't need *every* AppFolio feature to win our
> segment; this is about closing the gaps that block real deals.

## How to read this
Legend: ✅ have · 🟡 partial · ❌ missing · ➕ our differentiator (AppFolio weak/absent)

BuildingSync today (from the codebase): Buildings, Units, Leases, WorkOrders +
notes, Payments (model only), Announcements, Documents, Incidents, Amenities +
bookings, Events, Posts, Deliveries/packages, Notices (Ontario N4/N5/N12),
Audit log, Manager verification, Push notifications, Stripe (checkout + webhook
wired), AI announcement-draft + work-order-triage, data export, resident PWA,
team (BM/FM/Concierge) + platform admin portals.

---

## 1. Capability-by-capability

### Accounting & financials
| AppFolio | BuildingSync | Gap |
|---|---|---|
| Full GL, property accounting, budgeting, automated billing, owner statements | ❌ no general ledger; `Payment` model exists but no accounting engine | **Biggest gap.** Need GL, chart of accounts, AP/AR, owner statements, reconciliations, or a deliberate "we integrate with your accounting (QuickBooks/Xero), not replace it" stance. |

### Rent & online payments
| AppFolio | BuildingSync | Gap |
|---|---|---|
| Online rent, ACH/EFT, autopay, late fees, receipts | 🟡 Stripe checkout + webhook wired; `Payment` model; **not a real rent-collection flow yet** | Build recurring rent invoicing, autopay, late-fee rules, receipts, reconciliation. Region-specific rails (UPI/Interac/EFT) per the payments plan. |

### Leasing & marketing
| AppFolio | BuildingSync | Gap |
|---|---|---|
| Listing syndication (Zillow etc.), online applications, leasing CRM, e-sign | ❌ none; we have `Lease` records but no application/listing/e-sign | Add applicant pipeline, online application, e-signature, and (later) listing syndication. Leasing CRM is AppFolio's Max-tier moat. |

### Tenant screening
| AppFolio | BuildingSync | Gap |
|---|---|---|
| Credit / criminal / eviction screening (bureau-integrated) | ❌ none | Integrate a screening provider (e.g. Equifax/TransUnion in Canada). Compliance-heavy; partner rather than build. |

### Maintenance & work orders
| AppFolio | BuildingSync | Gap |
|---|---|---|
| Work orders, scheduling, automated billing, vendor coordination, agentic AI | ✅ work orders + notes + SLA + **AI triage** | 🟡 Close: add vendor assignment/portal, scheduling calendar, parts/inventory, photo attachments, automated vendor billing. ➕ our AI triage is already strong. |

### Vendor management
| AppFolio | BuildingSync | Gap |
|---|---|---|
| Vendor portal, POs, inventory, 1099 | ❌ `vendor` role exists; no vendor portal/PO | Build vendor portal (the R&D `VendorAccess` table anticipated this), POs, insurance/COI tracking. |

### Owner / investor portal
| AppFolio | BuildingSync | Gap |
|---|---|---|
| Owner portal, statements, distributions, reporting | ❌ `building_owner` role exists; no owner portal | Build owner portal + statements. Important for the REIT/multi-property buyer. |

### Resident / tenant portal & comms
| AppFolio | BuildingSync | Gap |
|---|---|---|
| Resident portal, payments, requests, SMS, broadcast | ✅ resident PWA, announcements, requests, deliveries, amenities, push | 🟡 Add SMS (roadmap), in-app messaging/threads. ➕ our PWA + audit-grade comms log is a differentiator. |

### Reporting & analytics
| AppFolio | BuildingSync | Gap |
|---|---|---|
| Real-time dashboards, custom reports, performance insights | 🟡 audit log + CSV exports; no analytics dashboards | Build operational dashboards (occupancy, SLA, spend) + the **energy/cost-saving analytics** that are our brand wedge. ➕ |

### AI
| AppFolio | BuildingSync | Gap |
|---|---|---|
| Realm-X assistant, agentic flows, messaging | 🟡 AI announcement-draft + triage; metering ledger started | ➕ Going **AI-native with metered, capability-tiered pricing** (see [INTEGRATIONS.md](INTEGRATIONS.md) §6a) is a wedge, not just parity. Add: AI policy assist, semantic search, agentic workflows. |

### Mobile
| AppFolio | BuildingSync | Gap |
|---|---|---|
| Native iOS/Android for staff + residents | 🟡 resident PWA; native app is roadmap (R3); separate mobile repo exists | Ship the native apps; reach feature parity with web. |

### Compliance / data
| AppFolio | BuildingSync | Gap |
|---|---|---|
| US-centric; SOC 2 | ➕ **PIPEDA / Quebec Law 25, Canadian residency, audit-grade, Ontario RTA notices** | Our compliance posture is a **differentiator** for Canadian/gov buyers AppFolio doesn't serve well. Finish SOC 2 (R3) + the residency/auth work. |

---

## 2. The differentiators to lean into (don't just copy AppFolio)
1. **Canadian-first compliance** — PIPEDA, Law 25, data residency, RTA/LTB notices. AppFolio is US-shaped.
2. **Audit-grade everything** — every action is evidence (LTB/insurance). Already built.
3. **AI-native, metered** — pay for the AI you use; per-building capability tiers.
4. **Cost-saving / energy analytics** — the brand promise (see [BRANDING.md](BRANDING.md)); AppFolio doesn't position here.
5. **Founder-led, small, responsive** — white-glove pilots, zero-cost simple migration.

## 3. Priority roadmap to "absolute"
**P0 — blocks real revenue/deals**
- Real rent collection (recurring invoices, autopay, late fees, receipts) on Stripe + regional rails.
- Accounting stance: build core ledger OR integrate QuickBooks/Xero (decide — see open question).
- Vendor management + portal (assignment, COI/insurance, POs).

**P1 — competitive parity**
- Leasing: online application, applicant pipeline, e-sign; screening via partner.
- Owner portal + statements.
- Operational analytics dashboards + energy/cost analytics.
- SMS + in-app messaging.

**P2 — moat / scale**
- Native mobile (staff + resident) at parity.
- Agentic AI workflows; AI policy assistant (metered).
- Listing syndication.
- SOC 2 Type II + the integrations marketplace (see [INTEGRATIONS.md](INTEGRATIONS.md)).

## 4. Open questions for the owner
- **Accounting:** build a full ledger (huge, but AppFolio's core moat) or **integrate** QuickBooks/Xero and stay the "operations + compliance + AI" layer? Strongly recommend integrate-first.
- **Screening & syndication:** partner (recommended) vs build.
- Which **P0** to start first — rent collection is usually the fastest path to "customers will pay."
