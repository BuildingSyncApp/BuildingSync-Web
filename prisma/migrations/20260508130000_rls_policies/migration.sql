-- ============================================================
-- RLS policies for the 11 public tables that already have
-- ENABLE ROW LEVEL SECURITY (from migration 20260508120000).
--
-- Policy model:
--   * Default deny for anon and authenticated.
--   * SELECT only via PostgREST — scoped to the caller's
--     building / role / ownership. No INSERT, UPDATE, DELETE
--     policies; supabase-js writes from the browser stay denied.
--   * Service role and the postgres role used by Prisma bypass RLS,
--     so server actions and adminSupabase() are unaffected.
--
-- Helpers live in a `private` schema so they're not exposed via
-- /rest/v1/rpc, avoiding the SECURITY DEFINER advisor warnings.
--
-- AuditLog gets a separate trigger that blocks UPDATE/DELETE/TRUNCATE
-- for every role — append-only enforced at the database, matching the
-- "evidence-grade for LTB/RTA" requirement in CLAUDE.md.
-- ============================================================

-- 1. Private schema for helper functions (not in PostgREST's exposed schemas).
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Cached lookups for the caller's User row. SECURITY DEFINER so the
-- function reads User regardless of User's own RLS, but isolated to the
-- private schema so it's not RPC-callable.
CREATE OR REPLACE FUNCTION private.app_user_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT role::text FROM public."User" WHERE id = (auth.uid())::text
$$;

CREATE OR REPLACE FUNCTION private.app_user_building_id() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT "buildingId" FROM public."User" WHERE id = (auth.uid())::text
$$;

CREATE OR REPLACE FUNCTION private.app_user_unit_id() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT "unitId" FROM public."User" WHERE id = (auth.uid())::text
$$;

CREATE OR REPLACE FUNCTION private.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT private.app_user_role() = 'admin'
$$;

CREATE OR REPLACE FUNCTION private.is_team_in_building(b text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT b IS NOT NULL
     AND private.app_user_building_id() = b
     AND private.app_user_role() IN ('building_manager','facility_manager','concierge')
$$;

GRANT EXECUTE ON FUNCTION private.app_user_role()         TO authenticated;
GRANT EXECUTE ON FUNCTION private.app_user_building_id()  TO authenticated;
GRANT EXECUTE ON FUNCTION private.app_user_unit_id()      TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin()              TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_team_in_building(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION private.app_user_role()         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.app_user_building_id()  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.app_user_unit_id()      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_admin()              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_team_in_building(text) FROM PUBLIC, anon;

-- ============================================================
-- 2. Per-table SELECT policies. No INSERT/UPDATE/DELETE policies
--    are added: PostgREST writes stay denied. All writes flow
--    through Prisma (postgres role) or service-role server actions.
-- ============================================================

-- USER: own row, admin, or team in same building.
DROP POLICY IF EXISTS "User_select" ON public."User";
CREATE POLICY "User_select" ON public."User"
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())::text
    OR private.is_admin()
    OR (
      "buildingId" IS NOT NULL
      AND private.is_team_in_building("buildingId")
    )
  );

-- BUILDING: admin sees all; anyone whose User.buildingId matches.
DROP POLICY IF EXISTS "Building_select" ON public."Building";
CREATE POLICY "Building_select" ON public."Building"
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR id = private.app_user_building_id()
  );

-- UNIT: admin or anyone in the same building.
DROP POLICY IF EXISTS "Unit_select" ON public."Unit";
CREATE POLICY "Unit_select" ON public."Unit"
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR "buildingId" = private.app_user_building_id()
  );

-- LEASE: admin, BM/FM in same building, or the tenant on the lease.
DROP POLICY IF EXISTS "Lease_select" ON public."Lease";
CREATE POLICY "Lease_select" ON public."Lease"
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR (
      "buildingId" = private.app_user_building_id()
      AND private.app_user_role() IN ('building_manager','facility_manager')
    )
    OR "tenantId" = (SELECT auth.uid())::text
  );

-- WORKORDER: admin, team in same building, opener, or assignee.
DROP POLICY IF EXISTS "WorkOrder_select" ON public."WorkOrder";
CREATE POLICY "WorkOrder_select" ON public."WorkOrder"
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_team_in_building("buildingId")
    OR "openedById" = (SELECT auth.uid())::text
    OR "assigneeId" = (SELECT auth.uid())::text
  );

-- WORKORDERNOTE: visible to anyone who can see the parent WorkOrder.
DROP POLICY IF EXISTS "WorkOrderNote_select" ON public."WorkOrderNote";
CREATE POLICY "WorkOrderNote_select" ON public."WorkOrderNote"
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM public."WorkOrder" wo
      WHERE wo.id = public."WorkOrderNote"."workOrderId"
        AND (
          private.is_team_in_building(wo."buildingId")
          OR wo."openedById" = (SELECT auth.uid())::text
          OR wo."assigneeId" = (SELECT auth.uid())::text
        )
    )
  );

-- PAYMENT: admin, the user who paid, or BM in same building.
DROP POLICY IF EXISTS "Payment_select" ON public."Payment";
CREATE POLICY "Payment_select" ON public."Payment"
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR "userId" = (SELECT auth.uid())::text
    OR (
      "buildingId" IS NOT NULL
      AND "buildingId" = private.app_user_building_id()
      AND private.app_user_role() = 'building_manager'
    )
  );

-- DOCUMENT: admin, team in building, or residents/tenants for public docs.
-- Soft-deleted rows hidden from everyone (admin reviews via Prisma if needed).
DROP POLICY IF EXISTS "Document_select" ON public."Document";
CREATE POLICY "Document_select" ON public."Document"
  FOR SELECT TO authenticated
  USING (
    "deletedAt" IS NULL
    AND (
      private.is_admin()
      OR private.is_team_in_building("buildingId")
      OR (
        visibility = 'public'
        AND "buildingId" = private.app_user_building_id()
        AND private.app_user_role() IN ('resident','tenant')
      )
    )
  );

-- ANNOUNCEMENT: admin, team in building, or residents/tenants in building
-- with audience filter. Soft-deleted rows hidden.
DROP POLICY IF EXISTS "Announcement_select" ON public."Announcement";
CREATE POLICY "Announcement_select" ON public."Announcement"
  FOR SELECT TO authenticated
  USING (
    "deletedAt" IS NULL
    AND (
      private.is_admin()
      OR private.is_team_in_building("buildingId")
      OR (
        "buildingId" = private.app_user_building_id()
        AND private.app_user_role() IN ('resident','tenant')
        AND (
          audience = 'all'
          OR (audience = 'tenants_only' AND private.app_user_role() = 'tenant')
          OR (
            audience = 'specific_units'
            AND private.app_user_unit_id() IS NOT NULL
            AND private.app_user_unit_id() = ANY ("targetUnitIds")
          )
        )
      )
    )
  );

-- INCIDENT: admin or team in same building. Residents/tenants do not
-- see incidents (matches /team-only routes in app/team/incidents/*).
DROP POLICY IF EXISTS "Incident_select" ON public."Incident";
CREATE POLICY "Incident_select" ON public."Incident"
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_team_in_building("buildingId")
  );

-- AUDITLOG: admin only via PostgREST. Server-side (Prisma) reads with
-- service-role bypass RLS as before.
DROP POLICY IF EXISTS "AuditLog_select_admin" ON public."AuditLog";
CREATE POLICY "AuditLog_select_admin" ON public."AuditLog"
  FOR SELECT TO authenticated
  USING (private.is_admin());

-- ============================================================
-- 3. AuditLog immutability — DB-level enforcement of append-only.
--    Triggers fire for every role including postgres / service_role,
--    so accidental .update() / .delete() in app code raises.
-- ============================================================

CREATE OR REPLACE FUNCTION private.auditlog_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'check_violation';
END
$$;

DROP TRIGGER IF EXISTS auditlog_no_modify   ON public."AuditLog";
DROP TRIGGER IF EXISTS auditlog_no_truncate ON public."AuditLog";

CREATE TRIGGER auditlog_no_modify
  BEFORE UPDATE OR DELETE ON public."AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION private.auditlog_immutable();

CREATE TRIGGER auditlog_no_truncate
  BEFORE TRUNCATE ON public."AuditLog"
  FOR EACH STATEMENT
  EXECUTE FUNCTION private.auditlog_immutable();
