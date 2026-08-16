import { NotificationType, Prisma } from "@prisma/client";

export function lowBalanceNotification(balanceAfter: Prisma.Decimal, threshold = 20) {
  return {
    type: NotificationType.LOW_BALANCE,
    title: "Solde faible",
    message: `Le solde du portefeuille est maintenant à ${balanceAfter.toFixed(2)} DH, sous le seuil de sécurité de ${threshold.toFixed(2)} DH.`
  };
}

export const notificationTypeLabels: Record<NotificationType, string> = {
  PLAYER_REGISTRATION_SUBMITTED: "Inscription joueur",
  PLAYER_REGISTRATION_APPROVED: "Compte activé",
  POLL_OPENED: "Sondage ouvert",
  POLL_CLOSING_SOON: "Clôture imminente",
  POLL_NEAR_FULL: "Sondage presque complet",
  POLL_PROMOTED: "Promotion depuis la liste d’attente",
  MATCH_CREATED: "Match créé",
  MATCH_UPDATED: "Match modifié",
  LOW_BALANCE: "Solde faible",
  MATCH_CONFIRMATION: "Participation confirmée",
  MATCH_CANCELLED: "Match annulé",
  TOP_UP_APPROVED: "Alimentation validée",
  TOP_UP_REJECTED: "Alimentation refusée",
  CONTRIBUTION_CREATED: "Cotisation créée",
  CONTRIBUTION_DEBITED: "Cotisation débitée",
  REFUND_CREATED: "Remboursement créé",
  GENERAL: "Information"
};

export function playerRegistrationSubmittedNotification(playerName: string) {
  return {
    type: NotificationType.PLAYER_REGISTRATION_SUBMITTED,
    title: "Nouvelle inscription",
    message: `${playerName} souhaite rejoindre Mini Sporty.`
  };
}

export function playerRegistrationApprovedNotification() {
  return {
    type: NotificationType.PLAYER_REGISTRATION_APPROVED,
    title: "Accès activé",
    message: "Ton compte est prêt. Tu peux maintenant te connecter."
  };
}

export function pollOpenedNotification(title: string) {
  return {
    type: NotificationType.POLL_OPENED,
    title: "Sondage ouvert",
    message: `Le sondage "${title}" est maintenant ouvert.`
  };
}

export function pollClosingSoonNotification(title: string, closesAt: Date) {
  return {
    type: NotificationType.POLL_CLOSING_SOON,
    title: "Sondage bientôt clôturé",
    message: `Le sondage "${title}" se clôture le ${closesAt.toLocaleString("fr-FR")}.`
  };
}

export function pollNearFullNotification(title: string, remainingSlots: number) {
  return {
    type: NotificationType.POLL_NEAR_FULL,
    title: "Sondage presque complet",
    message: `Le sondage "${title}" ne compte plus que ${remainingSlots} place${remainingSlots > 1 ? "s" : ""} disponible${remainingSlots > 1 ? "s" : ""}.`
  };
}

export function pollPromotedNotification(title: string) {
  return {
    type: NotificationType.POLL_PROMOTED,
    title: "Réponse promue",
    message: `Votre réponse au sondage "${title}" a été promue depuis la liste d’attente.`
  };
}

export function matchCreatedNotification(title: string) {
  return {
    type: NotificationType.MATCH_CREATED,
    title: "Match créé",
    message: `Le match "${title}" a été créé.`
  };
}

export function matchUpdatedNotification(title: string) {
  return {
    type: NotificationType.MATCH_UPDATED,
    title: "Match modifié",
    message: `Le match "${title}" a été modifié.`
  };
}

export function matchCancelledNotification(title: string) {
  return {
    type: NotificationType.MATCH_CANCELLED,
    title: "Match annulé",
    message: `Le match "${title}" a été annulé.`
  };
}
