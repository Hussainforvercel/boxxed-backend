-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'OPERATIONS', 'FINANCE_VIEWER', 'COMPLIANCE_AUDITOR');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'ONBOARDING', 'INACTIVE_SEASONAL', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('TRIAL', 'ACTIVE', 'PAUSED', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingCadence" AS ENUM ('FOUR_WEEKS', 'CALENDAR_MONTH');

-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'BUSY_THROTTLED', 'INACTIVE', 'CLOSED_EMERGENCY');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('BRANCH_MANAGER', 'KITCHEN_STAFF', 'DISPATCH_OPERATOR');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('INVITATION_PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "DropStatus" AS ENUM ('DRAFT_REVIEW', 'ACTIVE_DROP', 'SOLD_OUT', 'UNSOLD_EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_KITCHEN', 'READY_FOR_PICKUP', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('PENDING_REVIEW', 'INVESTIGATING', 'RESOLVED_REFUNDED', 'RESOLVED_REJECTED');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('PARTNER_ONBOARDED', 'PARTNER_STATUS_CHANGED', 'BRANCH_CREATED', 'BRANCH_THROTTLED', 'BRANCH_EMERGENCY_SHUTDOWN', 'DROP_CREATED', 'DROP_PUBLISHED', 'DROP_CANCELLED', 'COMMISSION_RATE_OVERRIDDEN', 'REFUND_DISPATCHED', 'STAFF_INVITED', 'STAFF_REVOKED', 'MASTER_MENU_UPDATED', 'BRANCH_MENU_OVERRIDDEN');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(100) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'OPERATIONS',
    "title" VARCHAR(60),
    "hqLocation" VARCHAR(60) NOT NULL DEFAULT 'Karachi HQ',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "avatarLetter" CHAR(2) NOT NULL,
    "avatarBg" VARCHAR(60),
    "partnerNumber" VARCHAR(16) NOT NULL,
    "cuisine" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500),
    "status" "PartnerStatus" NOT NULL DEFAULT 'ONBOARDING',
    "subscription" "SubscriptionTier" NOT NULL DEFAULT 'TRIAL',
    "contactName" VARCHAR(80) NOT NULL,
    "contactEmail" CITEXT NOT NULL,
    "contactPhone" VARCHAR(20) NOT NULL,
    "altPhone" VARCHAR(20),
    "onboardingDate" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onboardingFeeMinor" INTEGER NOT NULL DEFAULT 2500000,
    "onboardingFeeSettled" BOOLEAN NOT NULL DEFAULT false,
    "commissionRateBasisPoints" INTEGER NOT NULL DEFAULT 1500,
    "monthlyFeeMinor" INTEGER NOT NULL DEFAULT 2500000,
    "billingCadence" "BillingCadence" NOT NULL DEFAULT 'FOUR_WEEKS',
    "gstRegistrationNumber" VARCHAR(40),
    "gstRateBasisPoints" INTEGER NOT NULL DEFAULT 800,
    "ntnNumber" VARCHAR(40),
    "hqLedgerNotes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "internalCode" VARCHAR(32) NOT NULL,
    "locationArea" VARCHAR(100) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "geofenceRadiusKm" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "phone" VARCHAR(20) NOT NULL,
    "email" CITEXT NOT NULL,
    "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "orderIngestionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isThrottled" BOOLEAN NOT NULL DEFAULT false,
    "prepBufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "maxOrdersPerHour" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchOperatingSchedule" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" VARCHAR(8) NOT NULL,
    "closeTime" VARCHAR(8) NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BranchOperatingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchStaff" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" CITEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'KITCHEN_STAFF',
    "status" "StaffStatus" NOT NULL DEFAULT 'INVITATION_PENDING',
    "pinHash" VARCHAR(128),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BranchStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterMenuItem" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "sku" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "specNarrative" VARCHAR(300) NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "basePriceMinor" INTEGER NOT NULL,
    "gstRateBasisPoints" INTEGER NOT NULL DEFAULT 800,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MasterMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchMenuOverride" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "masterMenuItemId" UUID NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "customPriceMinor" INTEGER,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BranchMenuOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drop" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "sku" VARCHAR(24) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "categoryTag" VARCHAR(40) NOT NULL,
    "headlineItem" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "imageUrl" TEXT,
    "priceMinor" INTEGER NOT NULL,
    "originalPriceMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "discountTier" VARCHAR(20) NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "remainingQuantity" INTEGER NOT NULL,
    "pickupStart" TIMESTAMPTZ(3) NOT NULL,
    "pickupEnd" TIMESTAMPTZ(3) NOT NULL,
    "pickupSlotDuration" VARCHAR(60),
    "status" "DropStatus" NOT NULL DEFAULT 'DRAFT_REVIEW',
    "publishedAt" TIMESTAMPTZ(3),
    "postmortemNotes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Drop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" UUID NOT NULL,
    "orderNumber" VARCHAR(24) NOT NULL,
    "userId" UUID NOT NULL,
    "dropId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "priceMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "referenceCode" VARCHAR(12) NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "holdExpiresAt" TIMESTAMPTZ(3) NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "collectedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintTicket" (
    "id" UUID NOT NULL,
    "ticketNumber" VARCHAR(20) NOT NULL,
    "reservationId" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "customerName" VARCHAR(100) NOT NULL,
    "customerPhone" VARCHAR(20) NOT NULL,
    "reason" VARCHAR(300) NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "resolution" TEXT,
    "refundMinor" INTEGER,
    "resolvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "adminUserId" UUID,
    "actorEmail" CITEXT NOT NULL,
    "action" "AuditActionType" NOT NULL,
    "entityType" VARCHAR(40) NOT NULL,
    "entityId" VARCHAR(64) NOT NULL,
    "summary" VARCHAR(255) NOT NULL,
    "payloadJson" JSONB,
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPayout" (
    "id" UUID NOT NULL,
    "payoutReference" VARCHAR(32) NOT NULL,
    "restaurantId" UUID NOT NULL,
    "periodStart" TIMESTAMPTZ(3) NOT NULL,
    "periodEnd" TIMESTAMPTZ(3) NOT NULL,
    "grossBoxesSold" INTEGER NOT NULL,
    "grossSalesMinor" INTEGER NOT NULL,
    "platformFeeMinor" INTEGER NOT NULL,
    "taxWithheldMinor" INTEGER NOT NULL,
    "netPayableMinor" INTEGER NOT NULL,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_partnerNumber_key" ON "Restaurant"("partnerNumber");

-- CreateIndex
CREATE INDEX "Restaurant_status_subscription_idx" ON "Restaurant"("status", "subscription");

-- CreateIndex
CREATE INDEX "Restaurant_partnerNumber_idx" ON "Restaurant"("partnerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_internalCode_key" ON "Branch"("internalCode");

-- CreateIndex
CREATE INDEX "Branch_status_locationArea_idx" ON "Branch"("status", "locationArea");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_restaurantId_slug_key" ON "Branch"("restaurantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "BranchOperatingSchedule_branchId_dayOfWeek_key" ON "BranchOperatingSchedule"("branchId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "BranchStaff_email_idx" ON "BranchStaff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BranchStaff_branchId_email_key" ON "BranchStaff"("branchId", "email");

-- CreateIndex
CREATE INDEX "MasterMenuItem_restaurantId_category_idx" ON "MasterMenuItem"("restaurantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "MasterMenuItem_restaurantId_sku_key" ON "MasterMenuItem"("restaurantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "BranchMenuOverride_branchId_masterMenuItemId_key" ON "BranchMenuOverride"("branchId", "masterMenuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Drop_sku_key" ON "Drop"("sku");

-- CreateIndex
CREATE INDEX "Drop_status_pickupStart_idx" ON "Drop"("status", "pickupStart");

-- CreateIndex
CREATE INDEX "Drop_branchId_status_idx" ON "Drop"("branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_orderNumber_key" ON "Reservation"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_referenceCode_key" ON "Reservation"("referenceCode");

-- CreateIndex
CREATE INDEX "Reservation_dropId_status_idx" ON "Reservation"("dropId", "status");

-- CreateIndex
CREATE INDEX "Reservation_status_createdAt_idx" ON "Reservation"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_userId_idempotencyKey_key" ON "Reservation"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintTicket_ticketNumber_key" ON "ComplaintTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "ComplaintTicket_status_createdAt_idx" ON "ComplaintTicket"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayout_payoutReference_key" ON "PartnerPayout"("payoutReference");

-- CreateIndex
CREATE INDEX "PartnerPayout_restaurantId_periodStart_idx" ON "PartnerPayout"("restaurantId", "periodStart");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchOperatingSchedule" ADD CONSTRAINT "BranchOperatingSchedule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchStaff" ADD CONSTRAINT "BranchStaff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterMenuItem" ADD CONSTRAINT "MasterMenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchMenuOverride" ADD CONSTRAINT "BranchMenuOverride_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchMenuOverride" ADD CONSTRAINT "BranchMenuOverride_masterMenuItemId_fkey" FOREIGN KEY ("masterMenuItemId") REFERENCES "MasterMenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drop" ADD CONSTRAINT "Drop_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintTicket" ADD CONSTRAINT "ComplaintTicket_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintTicket" ADD CONSTRAINT "ComplaintTicket_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintTicket" ADD CONSTRAINT "ComplaintTicket_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayout" ADD CONSTRAINT "PartnerPayout_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business Rule SQL CHECK Constraints
ALTER TABLE "Drop" ADD CONSTRAINT check_drop_stock_bounds
  CHECK ("remainingQuantity" >= 0 AND "remainingQuantity" <= "totalQuantity");

ALTER TABLE "Drop" ADD CONSTRAINT check_drop_price_integrity
  CHECK ("priceMinor" > 0 AND "originalPriceMinor" >= "priceMinor");

ALTER TABLE "Drop" ADD CONSTRAINT check_drop_pickup_window
  CHECK ("pickupEnd" > "pickupStart");

ALTER TABLE "Restaurant" ADD CONSTRAINT check_commission_rate_bps
  CHECK ("commissionRateBasisPoints" >= 0 AND "commissionRateBasisPoints" <= 10000);
