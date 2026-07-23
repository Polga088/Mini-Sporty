-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "singletonKey" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "defaultGround" TEXT NOT NULL,
    "defaultMatchPrice" DECIMAL(12,2) NOT NULL,
    "defaultCapacity" INTEGER NOT NULL,
    "walletAlertThreshold" DECIMAL(12,2) NOT NULL,
    "whatsappTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_singletonKey_key" ON "AppSettings"("singletonKey");
