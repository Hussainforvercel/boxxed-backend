-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE 'RESTAURANT_ADMIN';

-- AlterTable
ALTER TABLE "BranchStaff" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
