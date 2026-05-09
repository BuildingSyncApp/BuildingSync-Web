-- ============================================================
-- Add covering indexes for two foreign keys flagged by the
-- Supabase performance advisor (lint 0001_unindexed_foreign_keys).
--
-- Without these, joins / lookups that filter on authorId or
-- buildingId on these tables fall back to sequential scans —
-- fine at current row counts but degrades as data grows.
-- ============================================================

CREATE INDEX IF NOT EXISTS "Announcement_authorId_idx" ON "Announcement"("authorId");
CREATE INDEX IF NOT EXISTS "Lease_buildingId_idx"      ON "Lease"("buildingId");
