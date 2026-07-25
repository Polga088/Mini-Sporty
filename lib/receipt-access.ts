import type { Role } from "@prisma/client";
import { isReceiptShareTokenValid } from "@/lib/topup-receipt";

type ReceiptAccessUser = {
  id: string;
  role?: Role | null;
} | null | undefined;

type ReceiptAccessTopUp = {
  userId: string;
  receiptShareTokenHash?: string | null;
  receiptShareTokenExpiresAt?: Date | null;
  receiptShareTokenRevokedAt?: Date | null;
};

export function canAccessTopUpReceipt(params: {
  user: ReceiptAccessUser;
  topUp: ReceiptAccessTopUp;
  shareToken?: string | null;
}) {
  if (params.user?.role === "ADMIN") {
    return true;
  }

  if (params.user?.id && params.user.id === params.topUp.userId) {
    return true;
  }

  return isReceiptShareTokenValid({
    token: params.shareToken,
    tokenHash: params.topUp.receiptShareTokenHash,
    expiresAt: params.topUp.receiptShareTokenExpiresAt,
    revokedAt: params.topUp.receiptShareTokenRevokedAt
  });
}
