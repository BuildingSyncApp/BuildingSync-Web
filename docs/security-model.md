# Security model — tenant isolation & access control

This note records *where* BuildingSync's access boundaries actually live, so the
guarantees aren't misread from the schema alone. See [auth-flow.svg](auth-flow.svg)
for the request/decision diagram.

## The three walls (every data action)

1. **Identity / portal guard** — `requireUser` / `requireTeam` / `requirePlatformAdmin`
   ([lib/auth.ts](../lib/auth.ts), [lib/team.ts](../lib/team.ts),
   [lib/platform.ts](../lib/platform.ts)). Decides which portal you may enter;
   `/platform` additionally requires the admin host.
2. **Capability check** — `can(user, capability)` against the `ROLE_CAPABILITIES`
   matrix in [lib/permissions.ts](../lib/permissions.ts). Decides whether your
   role may perform the action. ~45 call sites across team actions + `/api/*`.
3. **Ownership scope** — an explicit `where: { buildingId: session.appUser.buildingId }`
   predicate on the query. Decides whose data you may touch.

## RLS is NOT a load-bearing wall for app queries

Row-Level Security policies exist (`prisma/migrations/20260508130000_rls_policies`),
but **Prisma connects through `DATABASE_URL` as the table-owner Postgres role, which
bypasses RLS** (the migration header states this explicitly). Therefore:

- For every query the app makes, **RLS does nothing** — isolation comes only from
  the Wall 3 `where buildingId` predicate.
- RLS remains useful as defense-in-depth for the **PostgREST Data API**
  (`/rest/v1/…`, browser `supabase-js` reads), which the app does not rely on for
  tenant reads. Those policies are default-deny + SELECT-only.
- `AuditLog` append-only is enforced at the DB by a trigger (blocks UPDATE/DELETE
  for every role) — that one *is* DB-level and real.

### Standing invariant

**Every new tenant-scoped query MUST include the building filter**
(`where: { buildingId: session.appUser.buildingId }`, or a join that constrains to
it). There is no database safety net behind it. A missing filter is an IDOR. When
reviewing a change that reads/writes a building-scoped table, confirm the predicate
is present.

## Authentication (for completeness)

Supabase owns credentials and issues a signed JWT session; [lib/auth.ts](../lib/auth.ts)
`getOrCreateAppUser()` re-validates it each request and maps it to the Prisma `User`
row keyed by the same `auth.uid()`. Role lives on that `User` row, not in the token.
