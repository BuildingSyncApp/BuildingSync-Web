-- Recurring manager verification: history table + denormalised cache
-- fields on User. See prisma/schema.prisma > ManagerVerification.

ALTER TABLE "User"
  ADD COLUMN "lastVerifiedAt"      TIMESTAMP(3),
  ADD COLUMN "nextVerificationDue" TIMESTAMP(3);

CREATE TABLE "ManagerVerification" (
  "id"                  TEXT      PRIMARY KEY,
  "userId"              TEXT      NOT NULL,
  "reviewedById"        TEXT,
  "reviewedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil"          TIMESTAMP(3),
  "status"              TEXT      NOT NULL DEFAULT 'approved',
  "notes"               TEXT,
  "evidenceUrl"         TEXT,
  "companyName"         TEXT      NOT NULL,
  "managerType"         TEXT      NOT NULL,
  "businessNumber"      TEXT,
  "licenseNumber"       TEXT,
  "licenseExpiresAt"    TIMESTAMP(3),
  "trustAccountBank"    TEXT,
  "insuranceCarrier"    TEXT,
  "insurancePolicyNum"  TEXT,
  "insuranceExpiresAt"  TIMESTAMP(3),
  "managesReserveFund"  BOOLEAN   NOT NULL DEFAULT FALSE,
  "fidelityBondAmount"  DOUBLE PRECISION,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManagerVerification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ManagerVerification_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ManagerVerification_userId_reviewedAt_idx" ON "ManagerVerification"("userId", "reviewedAt");
CREATE INDEX "ManagerVerification_validUntil_idx"        ON "ManagerVerification"("validUntil");
CREATE INDEX "ManagerVerification_status_idx"            ON "ManagerVerification"("status");
