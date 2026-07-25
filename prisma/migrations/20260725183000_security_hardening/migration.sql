-- Security hardening: session invalidation, password reset audit and receipt sharing

ALTER TABLE "User"
ADD COLUMN "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "WalletTopUp"
ADD COLUMN "receiptShareTokenHash" TEXT,
ADD COLUMN "receiptShareTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "receiptShareTokenRevokedAt" TIMESTAMP(3);

CREATE TYPE "SecurityAuditType" AS ENUM ('PASSWORD_RESET');

CREATE TABLE "SecurityAudit" (
    "id" TEXT NOT NULL,
    "type" "SecurityAuditType" NOT NULL,
    "actorId" TEXT,
    "targetUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityAudit_type_createdAt_idx" ON "SecurityAudit"("type", "createdAt");
CREATE INDEX "SecurityAudit_actorId_createdAt_idx" ON "SecurityAudit"("actorId", "createdAt");
CREATE INDEX "SecurityAudit_targetUserId_createdAt_idx" ON "SecurityAudit"("targetUserId", "createdAt");

ALTER TABLE "SecurityAudit"
ADD CONSTRAINT "SecurityAudit_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SecurityAudit"
ADD CONSTRAINT "SecurityAudit_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
