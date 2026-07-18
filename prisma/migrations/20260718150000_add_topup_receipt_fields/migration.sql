-- AlterTable
ALTER TABLE "WalletTopUp" ADD COLUMN     "receiptGeneratedById" TEXT,
ADD COLUMN     "receiptIssuedAt" TIMESTAMP(3),
ADD COLUMN     "receiptNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WalletTopUp_receiptNumber_key" ON "WalletTopUp"("receiptNumber");

-- AddForeignKey
ALTER TABLE "WalletTopUp" ADD CONSTRAINT "WalletTopUp_receiptGeneratedById_fkey" FOREIGN KEY ("receiptGeneratedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
