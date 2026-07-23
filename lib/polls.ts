import { PollResponseChoice, PollStatus } from "@prisma/client";

export const pollStatusLabels: Record<PollStatus, string> = {
  DRAFT: "Brouillon",
  OPEN: "Ouvert",
  PAUSED: "Suspendu",
  CLOSED: "Clôturé",
  CANCELLED: "Annulé"
};

export const pollResponseLabels: Record<PollResponseChoice, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  MAYBE: "Peut-être"
};

export function pollStatusVariant(status: PollStatus): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "OPEN":
      return "success";
    case "PAUSED":
      return "warning";
    case "CLOSED":
      return "info";
    case "CANCELLED":
      return "danger";
    case "DRAFT":
    default:
      return "default";
  }
}

export function pollResponseVariant(response: PollResponseChoice): "default" | "success" | "warning" | "danger" | "info" {
  switch (response) {
    case "PRESENT":
      return "success";
    case "MAYBE":
      return "warning";
    case "ABSENT":
    default:
      return "danger";
  }
}

export function buildPollWhatsappMessage(params: {
  title: string;
  statusLabel: string;
  capacity: number;
  presentCount: number;
  waitlistCount: number;
  matchAmount: string;
}) {
  return [
    `Bonjour,`,
    "",
    `Sondage: ${params.title}`,
    `Statut: ${params.statusLabel}`,
    `Capacité: ${params.capacity}`,
    `Présents: ${params.presentCount}`,
    `Liste d’attente: ${params.waitlistCount}`,
    `Montant du match: ${params.matchAmount} DH`,
    "",
    "Merci."
  ].join("\n");
}
