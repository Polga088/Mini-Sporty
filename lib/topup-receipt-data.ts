import { createHash } from "node:crypto";
import { TopUpStatus, WalletTransactionType } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTopUpReceipt } from "@/lib/receipt-access";
import { ensureApprovedTopUpReceipt } from "@/lib/topup-receipt-ensure";

export type TopUpReceiptData = Awaited<ReturnType<typeof getTopUpReceiptData>>;
export type TopUpReceiptDataResult =
  | { ok: true; data: Awaited<ReturnType<typeof resolveTopUpReceiptData>> }
  | { ok: false; reason: "login" | "not-found" };

export function receiptVerificationHash(params: {
  receiptNumber: string;
  transactionId: string;
  topUpId: string;
}) {
  return createHash("sha256")
    .update(`${params.receiptNumber}:${params.transactionId}:${params.topUpId}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

export async function resolveTopUpReceiptData(topUpId: string, shareToken?: string | null) {
  noStore();
  const session = await auth();

  const topUp = await prisma.walletTopUp.findUnique({
    where: { id: topUpId },
    include: {
      user: { include: { wallet: true } },
      reviewedBy: true,
      receiptGeneratedBy: true
    }
  });

  if (!topUp) {
    return { ok: false as const, reason: "not-found" as const };
  }

  if (!canAccessTopUpReceipt({ user: session?.user, topUp, shareToken })) {
    if (!session?.user?.id && !shareToken) {
      return { ok: false as const, reason: "login" as const };
    }
    return { ok: false as const, reason: "not-found" as const };
  }

  if (topUp.status === TopUpStatus.APPROVED && (!topUp.receiptNumber || !topUp.receiptIssuedAt)) {
    await ensureApprovedTopUpReceipt(topUp.id, session?.user?.id);
    const refreshedTopUp = await prisma.walletTopUp.findUnique({
      where: { id: topUpId },
      include: {
        user: { include: { wallet: true } },
        reviewedBy: true,
        receiptGeneratedBy: true
      }
    });

    if (!refreshedTopUp) {
      return { ok: false as const, reason: "not-found" as const };
    }

    Object.assign(topUp, refreshedTopUp);
  }

  if (topUp.status !== TopUpStatus.APPROVED || !topUp.receiptNumber || !topUp.receiptIssuedAt || !topUp.user.wallet || !topUp.reviewedBy) {
    return { ok: false as const, reason: "not-found" as const };
  }

  const transaction = await prisma.walletTransaction.findFirst({
    where: {
      referenceType: "WalletTopUp",
      referenceId: topUp.id,
      type: WalletTransactionType.TOP_UP
    },
    orderBy: { createdAt: "desc" }
  });

  if (!transaction) {
    return { ok: false as const, reason: "not-found" as const };
  }

  return {
    ok: true as const,
    data: {
    session,
    topUp,
    transaction,
    verificationHash: receiptVerificationHash({
      receiptNumber: topUp.receiptNumber,
      transactionId: transaction.id,
      topUpId: topUp.id
    })
    }
  };
}

export async function getTopUpReceiptData(topUpId: string, shareToken?: string | null) {
  const result = await resolveTopUpReceiptData(topUpId, shareToken);

  if (!result.ok) {
    if (result.reason === "login") {
      redirect("/connexion");
    }
    notFound();
  }

  return result.data;
}
