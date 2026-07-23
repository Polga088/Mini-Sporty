import { Badge } from "@/components/ui/badge";

const messages: Record<string, { title: string; description: string; variant: "success" | "danger" | "warning" | "info" }> = {
  created: {
    title: "Joueur créé",
    description: "Le joueur a été créé avec son wallet.",
    variant: "success"
  },
  updated: {
    title: "Joueur mis à jour",
    description: "Les informations du joueur ont été enregistrées.",
    variant: "success"
  },
  disabled: {
    title: "Joueur désactivé",
    description: "Le joueur ne peut plus se connecter ni être ajouté à un match.",
    variant: "warning"
  },
  enabled: {
    title: "Joueur réactivé",
    description: "Le joueur peut de nouveau se connecter.",
    variant: "success"
  },
  adjusted: {
    title: "Portefeuille ajusté",
    description: "L’opération manuelle a été enregistrée.",
    variant: "success"
  },
  validation: {
    title: "Formulaire invalide",
    description: "Vérifie les champs puis réessaie.",
    variant: "danger"
  },
  invalid_date: {
    title: "Date invalide",
    description: "Vérifie la date du match, ainsi que les dates d’ouverture et de clôture du sondage.",
    variant: "danger"
  },
  email_taken: {
    title: "Email déjà utilisé",
    description: "Un autre compte utilise déjà cette adresse email.",
    variant: "danger"
  },
  not_found: {
    title: "Joueur introuvable",
    description: "Le joueur demandé n’existe pas ou a été supprimé.",
    variant: "danger"
  },
  insufficient_balance: {
    title: "Solde insuffisant",
    description: "Le débit demandé dépasse le solde disponible.",
    variant: "danger"
  },
  password_reset: {
    title: "Mot de passe réinitialisé",
    description: "Le joueur peut se reconnecter avec son nouveau mot de passe temporaire.",
    variant: "success"
  },
  delete_blocked: {
    title: "Suppression bloquée",
    description: "Le joueur possède encore des liens métier. Désactivez-le à la place.",
    variant: "warning"
  },
  deleted: {
    title: "Joueur supprimé",
    description: "Le compte joueur a été supprimé définitivement.",
    variant: "success"
  },
  settings_updated: {
    title: "Paramètres enregistrés",
    description: "Les paramètres généraux ont été mis à jour.",
    variant: "success"
  },
  already_processed: {
    title: "Demande déjà traitée",
    description: "Cette alimentation a déjà été validée, refusée ou annulée.",
    variant: "warning"
  },
  not_pending: {
    title: "Demande non modifiable",
    description: "Seules les demandes en attente peuvent être modifiées.",
    variant: "danger"
  },
  not_owner: {
    title: "Accès refusé",
    description: "Vous ne pouvez agir que sur vos propres demandes.",
    variant: "danger"
  },
  topup_requested: {
    title: "Demande envoyée",
    description: "Votre demande d’alimentation a bien été enregistrée.",
    variant: "success"
  },
  topup_approved: {
    title: "Alimentation validée",
    description: "Le wallet a été crédité et le reçu a été généré.",
    variant: "success"
  },
  topup_rejected: {
    title: "Alimentation refusée",
    description: "La demande d’alimentation a été refusée.",
    variant: "warning"
  },
  topup_cancelled: {
    title: "Demande annulée",
    description: "La demande d’alimentation a été annulée.",
    variant: "warning"
  },
  receipt_ready: {
    title: "Reçu disponible",
    description: "Vous pouvez imprimer ou télécharger le reçu maintenant.",
    variant: "success"
  },
  receipt_unavailable: {
    title: "Reçu indisponible",
    description: "Le reçu n’est disponible qu’après validation de la demande.",
    variant: "danger"
  },
  notification_read: {
    title: "Notification lue",
    description: "La notification a été marquée comme lue.",
    variant: "success"
  },
  notifications_read: {
    title: "Notifications lues",
    description: "Toutes vos notifications ont été marquées comme lues.",
    variant: "success"
  },
  match_created: {
    title: "Match créé",
    description: "Le match a été enregistré.",
    variant: "success"
  },
  match_updated: {
    title: "Match mis à jour",
    description: "Les informations du match ont été enregistrées.",
    variant: "success"
  },
  match_cancelled: {
    title: "Match annulé",
    description: "Les participants payés ont été remboursés.",
    variant: "warning"
  },
  participant_added: {
    title: "Joueur ajouté",
    description: "Le joueur a été ajouté au match.",
    variant: "success"
  },
  participant_confirmed: {
    title: "Participation confirmée",
    description: "Le joueur a été confirmé avec débit automatique.",
    variant: "success"
  },
  participant_waitlisted: {
    title: "Liste d’attente",
    description: "Le joueur a été placé sur la liste d’attente.",
    variant: "info"
  },
  participant_promoted: {
    title: "Joueur promu",
    description: "Le joueur en attente a été confirmé.",
    variant: "success"
  },
  participation_cancelled: {
    title: "Participation annulée",
    description: "La participation du joueur a été annulée.",
    variant: "warning"
  },
  attendance_marked: {
    title: "Présence enregistrée",
    description: "Le statut de présence du joueur a été mis à jour.",
    variant: "success"
  },
  capacity_reached: {
    title: "Capacité atteinte",
    description: "Le match est complet. Placez le joueur en liste d’attente.",
    variant: "danger"
  },
  inactive_player: {
    title: "Joueur inactif",
    description: "Un joueur désactivé ne peut pas être inscrit à un match.",
    variant: "danger"
  },
  already_participant: {
    title: "Déjà inscrit",
    description: "Ce joueur est déjà lié à ce match.",
    variant: "warning"
  },
  already_confirmed: {
    title: "Déjà confirmé",
    description: "Aucun nouveau débit n’a été appliqué.",
    variant: "info"
  },
  already_cancelled: {
    title: "Déjà annulé",
    description: "Cette participation est déjà annulée.",
    variant: "warning"
  },
  not_waitlisted: {
    title: "Liste d’attente requise",
    description: "Le joueur doit être en attente pour être promu.",
    variant: "danger"
  },
  invalid_state: {
    title: "État incompatible",
    description: "L’action demandée n’est pas possible dans l’état actuel.",
    variant: "danger"
  },
  poll_created: {
    title: "Sondage créé",
    description: "Le sondage a été enregistré.",
    variant: "success"
  },
  poll_updated: {
    title: "Sondage mis à jour",
    description: "Les paramètres du sondage ont été enregistrés.",
    variant: "success"
  },
  poll_opened: {
    title: "Sondage ouvert",
    description: "Les participants peuvent répondre.",
    variant: "success"
  },
  poll_paused: {
    title: "Sondage suspendu",
    description: "Les réponses sont momentanément bloquées.",
    variant: "warning"
  },
  poll_closed: {
    title: "Sondage clôturé",
    description: "Le sondage est fermé.",
    variant: "warning"
  },
  poll_reopened: {
    title: "Sondage rouvert",
    description: "Le sondage est à nouveau accessible.",
    variant: "success"
  },
  poll_cancelled: {
    title: "Sondage annulé",
    description: "Le sondage a été annulé.",
    variant: "danger"
  },
  poll_response_saved: {
    title: "Réponse enregistrée",
    description: "La réponse du joueur a été prise en compte.",
    variant: "success"
  },
  poll_match_created: {
    title: "Match créé",
    description: "Le match a été généré depuis le sondage.",
    variant: "success"
  },
  poll_capacity_updated: {
    title: "Capacité mise à jour",
    description: "Le sondage a été ajusté.",
    variant: "success"
  },
  not_open: {
    title: "Sondage fermé",
    description: "Le sondage n’accepte pas de nouvelles réponses pour le moment.",
    variant: "danger"
  },
  response_locked: {
    title: "Réponse verrouillée",
    description: "La modification de réponse est désactivée par l’administrateur.",
    variant: "warning"
  },
  capacity_too_small: {
    title: "Capacité trop faible",
    description: "La capacité ne peut pas être inférieure au nombre de présents actuels.",
    variant: "danger"
  },
  match_exists: {
    title: "Match déjà créé",
    description: "Un match a déjà été généré à partir de ce sondage.",
    variant: "warning"
  }
};

export function NoticeBanner({
  success,
  error
}: {
  success?: string;
  error?: string;
}) {
  const key = success ?? error;
  if (!key) return null;

  const notice = messages[key];
  if (!notice) return null;

  const variantClass =
    notice.variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : notice.variant === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : notice.variant === "info"
          ? "border-sky-200 bg-sky-50 text-sky-950"
          : "border-red-200 bg-red-50 text-red-950";

  return (
    <div className={`rounded-2xl border p-4 shadow-soft ${variantClass}`} role={error ? "alert" : "status"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{notice.title}</p>
          <p className="mt-1 text-sm opacity-90">{notice.description}</p>
        </div>
        <Badge variant={notice.variant}>{error ? "Erreur" : "OK"}</Badge>
      </div>
    </div>
  );
}
