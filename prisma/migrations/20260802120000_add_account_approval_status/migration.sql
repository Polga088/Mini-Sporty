-- CreateEnum
CREATE TYPE "AccountApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PLAYER_REGISTRATION_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'PLAYER_REGISTRATION_APPROVED';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "approvalStatus" "AccountApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "requestedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedById" TEXT,
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectedById" TEXT,
ADD COLUMN "rejectionReason" TEXT;

-- Existing accounts were created before autonomous registration existed.
UPDATE "User"
SET "approvalStatus" = 'APPROVED',
    "approvedAt" = COALESCE("approvedAt", "createdAt")
WHERE "approvalStatus" = 'APPROVED';

-- CreateIndex
CREATE INDEX "User_approvalStatus_requestedAt_idx" ON "User"("approvalStatus", "requestedAt");
CREATE INDEX "User_approvedById_approvedAt_idx" ON "User"("approvedById", "approvedAt");
CREATE INDEX "User_rejectedById_rejectedAt_idx" ON "User"("rejectedById", "rejectedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
