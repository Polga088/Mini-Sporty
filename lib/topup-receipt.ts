import { formatDh } from "@/lib/money";
import { PaymentMethod, TopUpStatus } from "@prisma/client";
import { randomUUID } from "crypto";

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
  const suffix = randomUUID().split("-")[0].toUpperCase();
  return `FMW-${dateStamp}-${timeStamp}-${suffix}`;
}

export function buildTopUpWhatsappMessage(params: {
  playerName: string;
  amount: string | number;
  receiptNumber: string;
  balanceAfter: string | number;
}) {
  return [
    `Bonjour ${params.playerName},`,
    "",
    `Votre alimentation de ${formatDh(params.amount)} a été validée.`,
    "",
    `Numéro de reçu : ${params.receiptNumber}`,
    `Nouveau solde : ${formatDh(params.balanceAfter)}`,
    "",
    "Merci."
  ].join("\n");
}
