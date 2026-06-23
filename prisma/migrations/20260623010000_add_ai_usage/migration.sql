-- Per-call AI usage ledger: billing source + audit trail for AI-assisted
-- actions (policy drafting, work-order triage, announcements). One row per
-- Claude request on behalf of a building. See prisma/schema.prisma > AiUsage.

CREATE TABLE "AiUsage" (
  "id"               TEXT         PRIMARY KEY,
  "buildingId"       TEXT         NOT NULL,
  "userId"           TEXT,
  "feature"          TEXT         NOT NULL,
  "model"            TEXT         NOT NULL,
  "inputTokens"      INTEGER      NOT NULL DEFAULT 0,
  "outputTokens"     INTEGER      NOT NULL DEFAULT 0,
  "cacheReadTokens"  INTEGER      NOT NULL DEFAULT 0,
  "cacheWriteTokens" INTEGER      NOT NULL DEFAULT 0,
  "costMicros"       INTEGER      NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiUsage_buildingId_fkey" FOREIGN KEY ("buildingId")
    REFERENCES "Building" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AiUsage_buildingId_createdAt_idx" ON "AiUsage" ("buildingId", "createdAt");
CREATE INDEX "AiUsage_buildingId_feature_idx"   ON "AiUsage" ("buildingId", "feature");
