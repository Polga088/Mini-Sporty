import { formatDh } from "@/lib/money";
import { PaymentMethod, TopUpStatus } from "@prisma/client";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Espèces",
  BANK_TRANSFER: "Virement bancaire",
  MOBILE_PAYMENT: "Paiement mobile",
  OTHER: "Autre"
};

const statusLabels: Record<TopUpStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Validée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée"
};

export function paymentMethodLabel(paymentMethod: PaymentMethod) {
  return paymentMethodLabels[paymentMethod];
}

export function topUpStatusLabel(status: TopUpStatus) {
  return statusLabels[status];
}

export function topUpStatusVariant(status: TopUpStatus): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "REJECTED":
    case "CANCELLED":
      return "danger";
    default:
      return "default";
  }
}

export function generateReceiptNumber(issuedAt = new Date()) {
  const dateStamp = issuedAt.toISOString().slice(0, 10).replaceAll("-", "");
  const timeStamp = issuedAt.toISOString().slice(11, 19).replaceAll(":", "");
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `FMW-${dateStamp}-${timeStamp}-${suffix}`;
}

export function generateReceiptShareToken() {
  return randomBytes(32).toString("base64url");
}

export function hashReceiptShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isReceiptShareTokenValid(params: {
  token?: string | null;
  tokenHash?: string | null;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
}) {
  if (!params.token || !params.tokenHash || !params.expiresAt || params.revokedAt) {
    return false;
  }

  if (params.expiresAt.getTime() <= Date.now()) {
    return false;
  }

  const expected = Buffer.from(params.tokenHash, "hex");
  const received = Buffer.from(hashReceiptShareToken(params.token), "hex");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

export function buildTopUpWhatsappMessage(params: {
  playerName: string;
  amount: string | number;
  receiptNumber: string;
  balanceAfter: string | number;
  template?: string;
}) {
  const template =
    params.template ??
    "Bonjour {name},\n\nVotre alimentation de {amount} DH a été validée.\n\nNuméro de reçu : {receiptNumber}\nNouveau solde : {balance} DH\n\nMerci.";

  return template
    .replaceAll("{name}", params.playerName)
    .replaceAll("{amount}", formatDh(params.amount))
    .replaceAll("{receiptNumber}", params.receiptNumber)
    .replaceAll("{balance}", formatDh(params.balanceAfter));
}
