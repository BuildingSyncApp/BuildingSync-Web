-- Enable Row Level Security on tables flagged by the Supabase advisor.
-- Lints addressed:
--   0013_rls_disabled_in_public  (11 tables)
--   0023_sensitive_columns_exposed (User.password)
--
-- Why this is safe for Website-Beta:
--   * All app data access goes through Prisma (lib/prisma.ts), which
--     connects via DATABASE_URL using the postgres role and bypasses RLS.
--   * Server actions that need admin privileges use SUPABASE_SERVICE_ROLE_KEY,
--     which also bypasses RLS.
--   * No supabase-js .from(<table>) calls exist in app code — only
--     .storage.from(<bucket>) for the documents bucket. Grep verified.
--   * Supabase Auth lives in the auth schema and is unaffected.
--
-- Effect after apply:
--   * The anon and authenticated PostgREST roles can no longer read or
--     write these tables (no policies are defined; default-deny applies).
--   * Prisma queries, service-role server actions, and Supabase Auth all
--     keep working unchanged.
--
-- WARNING — shared database:
--   This Postgres instance is shared with the R&D project
--   (super-octo-rotary-phone). Before applying, verify R&D does not query
--   these tables via the anon key; if it does, add explicit policies
--   for that workload before merging. Apply via Supabase SQL Editor or
--   `psql $DIRECT_URL -f migration.sql`. `prisma migrate deploy` will not
--   pick this up until a baseline is established (see schema.prisma top
--   comment — the schema is db-pulled, not migrated).
--
-- Adding policies later: when a feature needs supabase-js access from the
-- browser/anon role, add `CREATE POLICY ... ON public."Table" FOR <op>
-- TO authenticated USING (<predicate>);` in a follow-up migration. Don't
-- broaden access here.

ALTER TABLE public."Building"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Unit"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Lease"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WorkOrder"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WorkOrderNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payment"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Document"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Incident"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Announcement"  ENABLE ROW LEVEL SECURITY;
