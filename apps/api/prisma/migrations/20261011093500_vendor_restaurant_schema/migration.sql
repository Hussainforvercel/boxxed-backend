-- AlterTable
ALTER TABLE "BranchStaff" ADD COLUMN     "lastLoginAt" TIMESTAMPTZ(3),
ADD COLUMN     "passwordHash" VARCHAR(255),
ADD COLUMN     "username" VARCHAR(60);

-- AlterTable
ALTER TABLE "Drop" ADD COLUMN     "rackAllocation" VARCHAR(60),
ADD COLUMN     "scheduledTimeText" VARCHAR(40),
ADD COLUMN     "seriesCode" VARCHAR(32);

-- AlterTable
ALTER TABLE "MasterMenuItem" ADD COLUMN     "dietaryTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "expiresAt" TIMESTAMPTZ(3),
ADD COLUMN     "isTemporary" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "pickupOtp" VARCHAR(6),
ADD COLUMN     "rackLocation" VARCHAR(40);

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "activeDropWindow" VARCHAR(60),
ADD COLUMN     "address" VARCHAR(300),
ADD COLUMN     "bankAccountNumber" VARCHAR(64),
ADD COLUMN     "bankAccountTitle" VARCHAR(120),
ADD COLUMN     "bankIban" VARCHAR(40),
ADD COLUMN     "bankName" VARCHAR(100),
ADD COLUMN     "district" VARCHAR(100),
ADD COLUMN     "executiveChef" VARCHAR(100),
ADD COLUMN     "managerName" VARCHAR(100),
ADD COLUMN     "stationId" VARCHAR(32),
ADD COLUMN     "verificationPercent" INTEGER NOT NULL DEFAULT 95;

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "reservationId" UUID,
    "customerName" VARCHAR(100) NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "boxTitle" VARCHAR(120) NOT NULL,
    "comment" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reply" TEXT,
    "repliedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_restaurantId_createdAt_idx" ON "Review"("restaurantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Review_branchId_idx" ON "Review"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchStaff_username_key" ON "BranchStaff"("username");

-- CreateIndex
CREATE INDEX "BranchStaff_username_idx" ON "BranchStaff"("username");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
