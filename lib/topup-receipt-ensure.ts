import { Prisma, TopUpStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateReceiptNumber } from "@/lib/topup-receipt";

type TopUpReceiptSnapshot = {
  id: string;
  status: TopUpStatus;
  receiptNumber: string | null;
  receiptIssuedAt: Date | null;
  receiptGeneratedById: string | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
};

function receiptReady(topUp: TopUpReceiptSnapshot) {
  return Boolean(topUp.receiptNumber && topUp.receiptIssuedAt);
}

async function readSnapshot(topUpId: string) {
  return prisma.walletTopUp.findUnique({
    where: { id: topUpId },
    select: {
      id: true,
      status: true,
      receiptNumber: true,
      receiptIssuedAt: true,
      receiptGeneratedById: true,
      reviewedAt: true,
      reviewedById: true
    }
  });
}

export async function ensureApprovedTopUpReceipt(topUpId: string, generatedById?: string | null) {
  let topUp = await readSnapshot(topUpId);

  if (!topUp || topUp.status !== TopUpStatus.APPROVED) {
    return null;
  }

  if (receiptReady(topUp)) {
    return topUp;
  }

  const receiptIssuedAt = topUp.receiptIssuedAt ?? topUp.reviewedAt ?? new Date();
  const receiptGeneratedById = topUp.receiptGeneratedById ?? generatedById ?? topUp.reviewedById ?? null;

  if (!topUp.receiptNumber) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await prisma.walletTopUp.updateMany({
          where: {
            id: topUp.id,
            status: TopUpStatus.APPROVED,
            receiptNumber: null
          },
          data: {
            receiptNumber: generateReceiptNumber(receiptIssuedAt),
            receiptIssuedAt,
            receiptGeneratedById
          }
        });
        break;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
          throw error;
        }
      }
    }
  } else {
    await prisma.walletTopUp.update({
      where: { id: topUp.id },
      data: {
        receiptIssuedAt,
        receiptGeneratedById
      }
    });
  }

  topUp = await readSnapshot(topUpId);
  return topUp?.status === TopUpStatus.APPROVED ? topUp : null;
}
