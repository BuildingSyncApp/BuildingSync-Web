-- Inbound contact / pilot-interest submissions from the public /contact form.
-- Persisted before the notification email is attempted, so a missing
-- RESEND_API_KEY or a Resend outage can never silently drop a lead.
-- See prisma/schema.prisma > ContactSubmission.

CREATE TABLE "ContactSubmission" (
  "id"         TEXT         PRIMARY KEY,
  "name"       TEXT         NOT NULL,
  "email"      TEXT         NOT NULL,
  "topic"      TEXT         NOT NULL,
  "message"    TEXT         NOT NULL,
  "country"    TEXT,
  "userAgent"  TEXT,
  "emailedAt"  TIMESTAMP(3),
  "emailError" TEXT,
  "status"     TEXT         NOT NULL DEFAULT 'new',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ContactSubmission_status_createdAt_idx" ON "ContactSubmission" ("status", "createdAt");
CREATE INDEX "ContactSubmission_email_idx" ON "ContactSubmission" ("email");
