import type { UserRole } from "@prisma/client";

// ─── Centralized capability model (WS1) ────────────────────────────────
//
// Single source of truth for "who can do what". Before this module, role
// gates were inlined and duplicated across server actions and API routes
// (HIRING_ROLES, ALLOWED_ROLES, `role !== "building_manager"`, …). Those
// now funnel through `can()` so the matrix is auditable in one place and
// can grow a configurable per-building policy layer (WS2) and a license
// ceiling (future) without touching every call site.
//
// This file is intentionally pure (no DB, no `server-only`) so it can be
// imported from server actions, API routes, AND client components (e.g.
// to render nav by capability in WS2).
//
// `can()` is the composition of three layers, ALL of which must allow:
//   1. Role defaults     — the static matrix below.
//   2. Building policy    — board-configurable grants/revokes (WS2). No
//                           capability is policy-gated yet except the
//                           deferred governance.* ones, so when callers
//                           pass no policy the role decision stands.
//   3. License entitlement — SaaS plan ceiling (future). Inert today.

export type Capability =
  // Building staff / operations (enforced today)
  | "staff.manage" // hire, re-role, archive facility managers + concierges
  | "resident.manage" // add residents/tenants, record + end leases
  | "unit.manage" // add / bulk-import units
  | "document.manage" // upload + soft-delete building documents
  | "announcement.post" // broadcast an announcement
  | "announcement.delete" // retract an announcement
  | "announcement.draft_ai" // use the AI drafting assist
  | "incident.report" // file a building incident
  | "incident.resolve" // change incident status
  | "delivery.manage" // log packages + mark picked up
  | "workorder.manage" // change work-order status / assign
  | "workorder.triage" // run the AI triage summary
  // Building administration (BM-only management surfaces)
  | "notice.manage" // create / serve / withdraw RTA legal notices
  | "license.manage" // validate license key, send heartbeat
  | "building.create" // BM self-serve building creation
  | "access_request.manage" // rotate invite code, manage access requests
  | "communications.export" // export the building communications log
  | "audit.view" // view the building audit log
  // Governance (defined + gated now, NO UI yet — WS5). Eligibility is a
  // building-policy decision; see applyBuildingPolicy below.
  | "governance.vote"
  | "governance.view_board";

// Building-side staff sets. FM and concierge are SIBLINGS, not nested:
// concierge logs packages (delivery.manage) but cannot resolve incidents;
// FM resolves incidents + runs ops but does NOT log packages. Only the
// Building Manager is a true superset of both, so BM is derived as the
// union below rather than asserted by a flat hierarchy. (Encoding a
// BM ⊇ FM ⊇ concierge chain would wrongly grant FM delivery.manage.)
const CONCIERGE_CAPABILITIES: Capability[] = ["incident.report", "delivery.manage"];

const FACILITY_MANAGER_CAPABILITIES: Capability[] = [
  "resident.manage",
  "unit.manage",
  "document.manage",
  "incident.report",
  "incident.resolve",
  "workorder.manage",
  "workorder.triage",
];

// Capabilities only the Building Manager holds on top of FM ∪ concierge.
const BUILDING_MANAGER_ONLY: Capability[] = [
  "staff.manage",
  "announcement.post",
  "announcement.delete",
  "announcement.draft_ai",
  // BM-only building administration
  "notice.manage",
  "license.manage",
  "building.create",
  "access_request.manage",
  "communications.export",
  "audit.view",
];

const BUILDING_MANAGER_CAPABILITIES: Capability[] = uniqueCapabilities([
  ...FACILITY_MANAGER_CAPABILITIES,
  ...CONCIERGE_CAPABILITIES,
  ...BUILDING_MANAGER_ONLY,
]);

// Resident-facing roles. Owners and residents are governance-eligible by
// default; tenants only when the board enables it (policy.tenantsCanVote).
const RESIDENT_CAPABILITIES: Capability[] = ["governance.vote", "governance.view_board"];

// Every UserRole is listed explicitly so a new enum value forces a
// deliberate decision here (TS errors on a missing key). Roles not used
// by R1 team flows (property_manager, staff, security, vendor, guest) get
// no app capabilities; the platform `admin` operates via /platform under
// its own host+role guard (lib/platform.ts), not through this matrix.
export const ROLE_CAPABILITIES: Record<UserRole, Capability[]> = {
  admin: [],
  building_manager: BUILDING_MANAGER_CAPABILITIES,
  facility_manager: FACILITY_MANAGER_CAPABILITIES,
  concierge: CONCIERGE_CAPABILITIES,
  building_owner: RESIDENT_CAPABILITIES,
  resident: RESIDENT_CAPABILITIES,
  tenant: ["governance.view_board"], // vote is policy-gated (tenantsCanVote)
  property_manager: [],
  staff: [],
  security: [],
  vendor: [],
  guest: [],
};

// Human-readable labels for the WS2 settings UI + audit-log rendering.
export const CAPABILITY_LABELS: Record<Capability, string> = {
  "staff.manage": "Manage staff",
  "resident.manage": "Manage residents & leases",
  "unit.manage": "Manage units",
  "document.manage": "Manage documents",
  "announcement.post": "Post announcements",
  "announcement.delete": "Delete announcements",
  "announcement.draft_ai": "Draft announcements with AI",
  "incident.report": "Report incidents",
  "incident.resolve": "Resolve incidents",
  "delivery.manage": "Log & release packages",
  "workorder.manage": "Manage work orders",
  "workorder.triage": "AI work-order triage",
  "notice.manage": "Manage legal notices",
  "license.manage": "Manage license",
  "building.create": "Create a building",
  "access_request.manage": "Manage access & invite code",
  "communications.export": "Export communications log",
  "audit.view": "View audit log",
  "governance.vote": "Vote in governance",
  "governance.view_board": "View board area",
};

// ─── Layer 2: per-building policy (board-configurable) ──────────────────
// Shape mirrors the BuildingPolicy model added in WS2. Until then no
// caller passes a policy, so these defaults never alter a live decision.
export type BuildingPolicyFlags = {
  tenantsCanVote: boolean;
  residentsCanPost: boolean;
  tenantsCanBookAmenities: boolean;
  boardModuleEnabled: boolean;
};

export const DEFAULT_BUILDING_POLICY: BuildingPolicyFlags = {
  tenantsCanVote: false,
  residentsCanPost: true,
  tenantsCanBookAmenities: true,
  boardModuleEnabled: false,
};

// ─── Layer 3: license entitlement ceiling ──────────────────────────────
// Subset of the License model relevant to capability gating. Inert today
// (see LICENSE_REQUIRED) so AI gating still keys off ANTHROPIC_API_KEY at
// the route, not the SaaS plan.
export type LicenseEntitlements = {
  capabilities?: string[];
  aiEnabled?: boolean;
};

// Maps a capability to the License flag it requires. Empty in WS1; wire AI
// capabilities to `aiEnabled` here when the plan ceiling is enforced.
const LICENSE_REQUIRED: Partial<Record<Capability, keyof LicenseEntitlements>> = {};

export type CanContext = {
  policy?: BuildingPolicyFlags | null;
  license?: LicenseEntitlements | null;
};

/** True if the role's static matrix grants the capability. */
export function roleCan(role: UserRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

/** The full capability list for a role (for nav / UI in WS2). */
export function capabilitiesFor(role: UserRole): Capability[] {
  return ROLE_CAPABILITIES[role] ?? [];
}

/**
 * Authoritative capability check. Returns true only if the role, the
 * building policy, AND the license all permit the capability.
 *
 * `user` is anything carrying a role (Prisma User, API session user, …).
 */
export function can(
  user: { role: UserRole },
  capability: Capability,
  ctx: CanContext = {},
): boolean {
  const base = roleCan(user.role, capability);
  if (!applyBuildingPolicy(user.role, capability, base, ctx.policy)) return false;
  if (!licensePermits(capability, ctx.license)) return false;
  return true;
}

class CapabilityError extends Error {
  readonly capability: Capability;
  constructor(capability: Capability) {
    super(`Missing capability: ${capability}`);
    this.name = "CapabilityError";
    this.capability = capability;
  }
}

export { CapabilityError };

/**
 * Throwing variant for call sites that prefer fail-fast over a result
 * object. Server actions/API routes that must preserve a specific
 * response shape should use `can()` directly instead.
 */
export function requireCapability(
  user: { role: UserRole },
  capability: Capability,
  ctx: CanContext = {},
): void {
  if (!can(user, capability, ctx)) throw new CapabilityError(capability);
}

// Resolve the per-building policy layer for a capability. Returns whether
// the capability is permitted after policy is applied, starting from the
// role-default decision `base`.
function applyBuildingPolicy(
  role: UserRole,
  capability: Capability,
  base: boolean,
  policy: BuildingPolicyFlags | null | undefined,
): boolean {
  switch (capability) {
    case "governance.vote": {
      // Governance is off until the board turns the module on. With no
      // policy supplied (the case in WS1) it stays off.
      if (!policy?.boardModuleEnabled) return false;
      // Tenants vote only when the board allows it; owners/residents keep
      // their role default.
      if (role === "tenant") return Boolean(policy.tenantsCanVote);
      return base;
    }
    case "governance.view_board":
      return Boolean(policy?.boardModuleEnabled) && base;
    default:
      // No other capability is policy-gated yet. Revoke-style toggles
      // (e.g. residentsCanPost) are wired in WS2.
      return base;
  }
}

// License ceiling. A capability not present in LICENSE_REQUIRED is never
// license-gated; if a license context isn't supplied we don't restrict.
function licensePermits(
  capability: Capability,
  license: LicenseEntitlements | null | undefined,
): boolean {
  const required = LICENSE_REQUIRED[capability];
  if (!required) return true;
  if (!license) return true;
  return Boolean(license[required]);
}

function uniqueCapabilities(caps: Capability[]): Capability[] {
  return Array.from(new Set(caps));
}
