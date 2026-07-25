import { PollResponseChoice, PollStatus } from "@prisma/client";
import { formatDh } from "@/lib/money";

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
  matchDate: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  presentCount: number;
  waitlistCount: number;
  matchAmount: string;
  link?: string;
  organizationName?: string;
}) {
  return [
    `Bonjour,`,
    "",
    `${params.organizationName ?? "Friday Match Wallet"} partage un sondage.`,
    `Sondage: ${params.title}`,
    `Statut: ${params.statusLabel}`,
    `Date: ${params.matchDate}`,
    `Horaire: ${params.startTime} - ${params.endTime}`,
    `Terrain: ${params.location}`,
    `Capacité: ${params.capacity}`,
    `Présents: ${params.presentCount}`,
    `Places restantes: ${Math.max(0, params.capacity - params.presentCount)}`,
    `Liste d’attente: ${params.waitlistCount}`,
    `Montant du match: ${formatDh(params.matchAmount)}`,
    params.link ? `Lien direct: ${params.link}` : "",
    "",
    "Merci."
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPollReminderWhatsappMessage(params: {
  title: string;
  matchDate: string;
  startTime: string;
  endTime: string;
  location: string;
  matchAmount: string;
  closesAt: string;
  link?: string;
}) {
  return [
    `Bonjour,`,
    "",
    `Rappel: le sondage "${params.title}" se clôture le ${params.closesAt}.`,
    `Match: ${params.matchDate} · ${params.startTime} - ${params.endTime}`,
    `Terrain: ${params.location}`,
    `Prix joueur: ${formatDh(params.matchAmount)}`,
    params.link ? `Lien direct: ${params.link}` : "",
    "",
    "Merci."
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPollCancellationWhatsappMessage(params: {
  title: string;
  matchDate: string;
  startTime: string;
  endTime: string;
  location: string;
  matchAmount: string;
  reason?: string;
  link?: string;
}) {
  return [
    `Bonjour,`,
    "",
    `Le sondage "${params.title}" a été annulé.`,
    `Match: ${params.matchDate} · ${params.startTime} - ${params.endTime}`,
    `Terrain: ${params.location}`,
    `Prix joueur: ${formatDh(params.matchAmount)}`,
    params.reason ? `Motif: ${params.reason}` : "",
    params.link ? `Lien direct: ${params.link}` : "",
    "",
    "Merci."
  ]
    .filter(Boolean)
    .join("\n");
}
