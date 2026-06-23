-- Per-building policy management. Each building authors and controls its own
-- policies (pets, noise, amenities, parking, smoking, STR, safety, ...). AI
-- assists with drafting (metered via AiUsage, feature "policy_assist") but the
-- building team owns the final text + publish decision.
-- See prisma/schema.prisma > Policy.

CREATE TABLE "Policy" (
  "id"          TEXT         PRIMARY KEY,
  "buildingId"  TEXT         NOT NULL,
  "title"       TEXT         NOT NULL,
  "category"    TEXT         NOT NULL DEFAULT 'general',
  "body"        TEXT         NOT NULL,
  "status"      TEXT         NOT NULL DEFAULT 'draft',
  "aiAssisted"  BOOLEAN      NOT NULL DEFAULT false,
  "createdById" TEXT         NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Policy_buildingId_fkey" FOREIGN KEY ("buildingId")
    REFERENCES "Building" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Policy_buildingId_status_idx"   ON "Policy" ("buildingId", "status");
CREATE INDEX "Policy_buildingId_category_idx" ON "Policy" ("buildingId", "category");
