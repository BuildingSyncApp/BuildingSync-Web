-- Init migration: full base schema (squashed from the prior incremental
-- migrations, which assumed a Supabase db-push base and could not apply to
-- a fresh database). Generated from prisma/schema.prisma, then RLS
-- enablement + policies (not modeled by Prisma) appended below.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'facility_manager', 'building_manager', 'building_owner', 'property_manager', 'resident', 'tenant', 'concierge', 'staff', 'security', 'vendor', 'guest');

-- CreateEnum
CREATE TYPE "BuildingType" AS ENUM ('commercial', 'residential', 'mixed', 'industrial');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('open', 'in_progress', 'scheduled', 'completed', 'closed');

-- CreateEnum
CREATE TYPE "WorkOrderPriority" AS ENUM ('urgent', 'high', 'normal', 'low');

-- CreateEnum
CREATE TYPE "SlaPolicy" AS ENUM ('urgent_4h', 'high_24h', 'normal_72h', 'low_7d');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "AmenityApprovalPolicy" AS ENUM ('auto_approve', 'manager_approval');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('security', 'safety', 'noise', 'damage', 'other');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'in_progress', 'resolved');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('all', 'tenants_only', 'specific_units');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL,
    "company" TEXT,
    "buildingId" TEXT,
    "unitId" TEXT,
    "unit" TEXT,
    "avatar" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOrgAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isBillingOwner" BOOLEAN NOT NULL DEFAULT false,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifySms" BOOLEAN NOT NULL DEFAULT false,
    "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
    "region" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "managerType" TEXT,
    "businessNumber" TEXT,
    "licenseNumber" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "nextVerificationDue" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "archiveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "type" "BuildingType" NOT NULL,
    "totalUnits" INTEGER,
    "totalArea" DOUBLE PRECISION,
    "yearBuilt" INTEGER,
    "description" TEXT,
    "imageUrl" TEXT,
    "timezone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enabledModules" JSONB,
    "inviteCode" TEXT,
    "inviteCodeUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "floor" INTEGER,
    "wing" TEXT,
    "unitType" TEXT,
    "squareFeet" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "currentTenant" TEXT,
    "occupancyStatus" TEXT NOT NULL DEFAULT 'vacant',
    "rentAmount" DOUBLE PRECISION,
    "leaseEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leaseStartDate" TIMESTAMP(3) NOT NULL,
    "leaseEndDate" TIMESTAMP(3) NOT NULL,
    "rentAmountMonthly" DOUBLE PRECISION NOT NULL,
    "securityDeposit" DOUBLE PRECISION,
    "leaseType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archiveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "description" TEXT,
    "priority" "WorkOrderPriority" NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'open',
    "openedById" TEXT,
    "assigneeId" TEXT,
    "vendorId" TEXT,
    "slaPolicy" "SlaPolicy" NOT NULL,
    "slaDeadline" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderNote" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT,
    "userId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "method" TEXT,
    "stripeId" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'all',
    "targetUnitIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "visibility" TEXT NOT NULL DEFAULT 'staff_only',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'medium',
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "buildingId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bookingRequired" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER,
    "imageUrl" TEXT,
    "openTime" TEXT NOT NULL DEFAULT '09:00',
    "closeTime" TEXT NOT NULL DEFAULT '21:00',
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "advanceNoticeHours" INTEGER NOT NULL DEFAULT 0,
    "cleanupBufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "maxBookingDurationMinutes" INTEGER,
    "approvalPolicy" "AmenityApprovalPolicy" NOT NULL DEFAULT 'auto_approve',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmenityRule" (
    "id" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmenityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmenityBooking" (
    "id" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'confirmed',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmenityBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "location" TEXT,
    "imageUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "loggedById" TEXT,
    "sender" TEXT NOT NULL,
    "description" TEXT,
    "pickupCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickedUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'approved',
    "notes" TEXT,
    "evidenceUrl" TEXT,
    "companyName" TEXT NOT NULL,
    "managerType" TEXT NOT NULL,
    "businessNumber" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiresAt" TIMESTAMP(3),
    "trustAccountBank" TEXT,
    "insuranceCarrier" TEXT,
    "insurancePolicyNum" TEXT,
    "insuranceExpiresAt" TIMESTAMP(3),
    "managesReserveFund" BOOLEAN NOT NULL DEFAULT false,
    "fidelityBondAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagerVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnpremLicense" (
    "id" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "customerOrg" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "notes" TEXT,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxBuildings" INTEGER NOT NULL DEFAULT 10,
    "maxUnits" INTEGER NOT NULL DEFAULT 1000,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "applianceId" TEXT,
    "applianceFingerprint" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "lastReportedVersion" TEXT,
    "lastReportedIp" TEXT,
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnpremLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT,
    "product" TEXT NOT NULL DEFAULT 'BuildingSync SaaS',
    "mode" TEXT NOT NULL DEFAULT 'saas',
    "plan" TEXT NOT NULL DEFAULT 'essential',
    "customer" TEXT,
    "seatLimit" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "signedPayload" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "leaseId" TEXT,
    "tenantUserId" TEXT,
    "createdById" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "payload" JSONB NOT NULL,
    "servedAt" TIMESTAMP(3),
    "servedMethod" TEXT,
    "remediationBy" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "country" TEXT,
    "userAgent" TEXT,
    "emailedAt" TIMESTAMP(3),
    "emailError" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_buildingId_idx" ON "User"("buildingId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_unitId_idx" ON "User"("unitId");

-- CreateIndex
CREATE INDEX "User_archivedAt_idx" ON "User"("archivedAt");

-- CreateIndex
CREATE INDEX "User_verifiedAt_idx" ON "User"("verifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Building_inviteCode_key" ON "Building"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_buildingId_unitNumber_key" ON "Unit"("buildingId", "unitNumber");

-- CreateIndex
CREATE INDEX "Lease_tenantId_idx" ON "Lease"("tenantId");

-- CreateIndex
CREATE INDEX "Lease_unitId_idx" ON "Lease"("unitId");

-- CreateIndex
CREATE INDEX "Lease_buildingId_idx" ON "Lease"("buildingId");

-- CreateIndex
CREATE INDEX "WorkOrder_buildingId_status_idx" ON "WorkOrder"("buildingId", "status");

-- CreateIndex
CREATE INDEX "WorkOrder_assigneeId_idx" ON "WorkOrder"("assigneeId");

-- CreateIndex
CREATE INDEX "WorkOrder_openedById_idx" ON "WorkOrder"("openedById");

-- CreateIndex
CREATE INDEX "WorkOrderNote_workOrderId_createdAt_idx" ON "WorkOrderNote"("workOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkOrderNote_authorId_idx" ON "WorkOrderNote"("authorId");

-- CreateIndex
CREATE INDEX "Announcement_buildingId_createdAt_idx" ON "Announcement"("buildingId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Announcement_deletedAt_idx" ON "Announcement"("deletedAt");

-- CreateIndex
CREATE INDEX "Announcement_audience_idx" ON "Announcement"("audience");

-- CreateIndex
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");

-- CreateIndex
CREATE INDEX "Document_buildingId_visibility_deletedAt_idx" ON "Document"("buildingId", "visibility", "deletedAt");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Incident_buildingId_status_idx" ON "Incident"("buildingId", "status");

-- CreateIndex
CREATE INDEX "Incident_buildingId_createdAt_idx" ON "Incident"("buildingId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Incident_reportedById_idx" ON "Incident"("reportedById");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_buildingId_createdAt_idx" ON "AuditLog"("buildingId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Amenity_buildingId_idx" ON "Amenity"("buildingId");

-- CreateIndex
CREATE INDEX "AmenityRule_amenityId_idx" ON "AmenityRule"("amenityId");

-- CreateIndex
CREATE INDEX "AmenityBooking_amenityId_startTime_idx" ON "AmenityBooking"("amenityId", "startTime");

-- CreateIndex
CREATE INDEX "AmenityBooking_userId_idx" ON "AmenityBooking"("userId");

-- CreateIndex
CREATE INDEX "Event_buildingId_startTime_idx" ON "Event"("buildingId", "startTime");

-- CreateIndex
CREATE INDEX "Post_buildingId_createdAt_idx" ON "Post"("buildingId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_deletedAt_idx" ON "Post"("deletedAt");

-- CreateIndex
CREATE INDEX "Delivery_buildingId_status_idx" ON "Delivery"("buildingId", "status");

-- CreateIndex
CREATE INDEX "Delivery_recipientUserId_status_idx" ON "Delivery"("recipientUserId", "status");

-- CreateIndex
CREATE INDEX "ManagerVerification_userId_reviewedAt_idx" ON "ManagerVerification"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "ManagerVerification_validUntil_idx" ON "ManagerVerification"("validUntil");

-- CreateIndex
CREATE INDEX "ManagerVerification_status_idx" ON "ManagerVerification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OnpremLicense_licenseKey_key" ON "OnpremLicense"("licenseKey");

-- CreateIndex
CREATE INDEX "OnpremLicense_customerOrg_idx" ON "OnpremLicense"("customerOrg");

-- CreateIndex
CREATE INDEX "OnpremLicense_expiresAt_idx" ON "OnpremLicense"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "License_buildingId_key" ON "License"("buildingId");

-- CreateIndex
CREATE INDEX "License_buildingId_idx" ON "License"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "Notice_buildingId_status_idx" ON "Notice"("buildingId", "status");

-- CreateIndex
CREATE INDEX "Notice_leaseId_idx" ON "Notice"("leaseId");

-- CreateIndex
CREATE INDEX "Notice_tenantUserId_idx" ON "Notice"("tenantUserId");

-- CreateIndex
CREATE INDEX "ContactSubmission_status_createdAt_idx" ON "ContactSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_email_idx" ON "ContactSubmission"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderNote" ADD CONSTRAINT "WorkOrderNote_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderNote" ADD CONSTRAINT "WorkOrderNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amenity" ADD CONSTRAINT "Amenity_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmenityRule" ADD CONSTRAINT "AmenityRule_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmenityBooking" ADD CONSTRAINT "AmenityBooking_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmenityBooking" ADD CONSTRAINT "AmenityBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerVerification" ADD CONSTRAINT "ManagerVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerVerification" ADD CONSTRAINT "ManagerVerification_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================
-- Row Level Security (not modeled by Prisma schema). Folded in
-- from the former 20260508120000_enable_rls + 20260508130000_rls_policies.
-- ============================================================

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
