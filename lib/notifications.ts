import { NotificationType, Prisma } from "@prisma/client";

export function lowBalanceNotification(balanceAfter: Prisma.Decimal) {
  return {
    type: NotificationType.LOW_BALANCE,
    title: "Solde faible",
    message: `Le solde du portefeuille est maintenant à ${balanceAfter.toFixed(2)} DH, sous le seuil de sécurité.`
  };
}

