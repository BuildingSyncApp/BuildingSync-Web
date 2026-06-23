// tenant-datasource.ts — SCAFFOLD (not yet wired into the request path).
//
// This is the contract the upcoming region/BYO migration plugs into. See
// docs/ARCHITECTURE-MIGRATION.md §3.1. It intentionally does NOT change how the
// app talks to the database today: lib/prisma.ts still owns the single global
// PrismaClient off DATABASE_URL, and all 78 `import { prisma }` sites are
// untouched. Nothing imports this module yet — it exists so the migration can
// land the resolver incrementally and reviewably, without a big-bang rewrite.
//
// When the migration is approved, lib/prisma.ts (or a per-request accessor) will
// call resolveTenantDatasource() and get-or-create a pooled client for the
// returned connection. The Wall-3 `where: { buildingId }` isolation invariant
// from docs/security-model.md remains mandatory regardless of which datasource a
// tenant resolves to — the datasource decides *which database*, the predicate
// still decides *whose rows*.

/** Where a tenant's data physically lives. */
export type TenantDatasource =
  | {
      kind: "managed-regional";
      /** Region key, e.g. "ca-central-1". Drives which managed DB we use. */
      region: string;
    }
  | {
      kind: "byo";
      /**
       * Customer-supplied Postgres connection string. MUST be stored encrypted
       * at rest (app-level) in the control-plane registry and only decrypted in
       * memory at resolution time. Never log this value.
       */
      connectionString: string;
      /** Optional label for diagnostics (never include credentials here). */
      label?: string;
    };

/** Identifies the tenant we're resolving a datasource for. */
export interface TenantRef {
  /** Building/org id used as the tenant boundary across the app. */
  buildingId?: string | null;
  /** Region captured at signup (User.region) — the near-term routing signal. */
  region?: string | null;
}

/**
 * The single managed region we run today. Until multi-region/BYO is turned on,
 * every tenant resolves here and behavior is identical to the current setup.
 */
export const DEFAULT_REGION = "ca-central-1";

/**
 * Resolve a tenant to its datasource.
 *
 * NEAR-TERM: returns the default managed Canadian region for everyone, so this
 * is a no-op relative to today's single-DB setup. The control-plane registry
 * lookup (tenant → region | BYO connection string) replaces this body when the
 * migration lands; the signature stays stable so callers don't change.
 */
export function resolveTenantDatasource(_tenant: TenantRef = {}): TenantDatasource {
  return { kind: "managed-regional", region: DEFAULT_REGION };
}
