import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoticeBanner } from "@/components/notice-banner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { ConfirmButton } from "@/components/confirm-button";
import { PollActionsMenu } from "@/components/poll-actions-menu";
import { PollProgress } from "@/components/poll-progress";
import { Timeline } from "@/components/timeline";
import { PollBoard } from "@/components/poll-board";
import { WhatsAppActions } from "@/components/whatsapp-actions";
import { canManageSport } from "@/lib/permissions";
import { buildPollWhatsappMessage, pollStatusLabels, pollStatusVariant } from "@/lib/polls";
import { getAppSettings } from "@/lib/settings";
import {
  addPollParticipant,
  cancelPoll,
  closePoll,
  createMatchFromPoll,
  movePollParticipant,
  openPoll,
  pausePoll,
  promotePollParticipant,
  removePollParticipant,
  reopenPoll,
  updatePoll,
  updatePollCapacity
} from "@/app/actions/polls";

type QueryParams = Record<string, string | string[] | undefined>;
type FeedTone = "default" | "success" | "warning" | "danger" | "info";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPollDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<QueryParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canManageSport(session.user.role)) redirect("/espace");

  const { id } = await params;
  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);
  const settings = await getAppSettings();

  const poll = await prisma.poll.findUnique({
    where: { id },
    include: {
      createdBy: true,
      match: true,
      responses: {
        orderBy: [{ isWaitlisted: "asc" }, { waitlistOrder: "asc" }, { createdAt: "asc" }],
        include: {
          user: true,
          managedBy: true
        }
      }
    }
  });

  if (!poll) notFound();

  const players = await prisma.user.findMany({
    where: { role: Role.PLAYER, isActive: true },
    orderBy: { name: "asc" }
  });

  const presentCount = poll.responses.filter((response) => response.response === "PRESENT" && !response.isWaitlisted).length;
  const waitlistCount = poll.responses.filter((response) => response.isWaitlisted).length;
  const maybeCount = poll.responses.filter((response) => response.response === "MAYBE").length;
  const absentCount = poll.responses.filter((response) => response.response === "ABSENT").length;
  const fillRate = poll.capacity > 0 ? Math.round((presentCount / poll.capacity) * 100) : 0;
  const whatsappMessage = buildPollWhatsappMessage({
    title: poll.title,
    statusLabel: pollStatusLabels[poll.status],
    matchDate: format(poll.matchDate, "EEEE d MMMM yyyy", { locale: fr }),
    startTime: poll.startTime,
    endTime: poll.endTime,
    location: poll.location,
    capacity: poll.capacity,
    presentCount,
    waitlistCount,
    matchAmount: poll.matchAmount.toString(),
    link: `/admin/sondages/${poll.id}`,
    organizationName: settings.organizationName
  });

  const availablePlayers = players.filter((player) => !poll.responses.some((response) => response.userId === player.id));

  const timelineItems: Array<{ title: string; description: string; meta?: string; tone?: FeedTone }> = [
    {
      title: "Création",
      description: `Créé par ${poll.createdBy.name} le ${format(poll.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })}`,
      meta: "Créé",
      tone: "info" as const
    },
    {
      title: "Ouverture",
      description: poll.opensAt ? `Ouverture prévue le ${format(poll.opensAt, "dd/MM/yyyy HH:mm", { locale: fr })}` : "Pas de date d’ouverture définie",
      meta: poll.status === "OPEN" ? "Ouvert" : "Planifié",
      tone: poll.status === "OPEN" ? "success" : "default"
    },
    {
      title: "Clôture",
      description: poll.closesAt ? `Clôture prévue le ${format(poll.closesAt, "dd/MM/yyyy HH:mm", { locale: fr })}` : "Pas de date de clôture définie",
      meta: poll.status === "CLOSED" ? "Clôturé" : "À venir",
      tone: poll.status === "CLOSED" ? "warning" : "default"
    }
  ];

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="md:col-span-2 xl:col-span-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-3xl">{poll.title}</CardTitle>
                <Badge variant={pollStatusVariant(poll.status)}>{pollStatusLabels[poll.status]}</Badge>
              </div>
              <CardDescription className="max-w-3xl">
                {poll.matchTitle} · {poll.location} · {formatDh(poll.matchAmount)} · {format(poll.matchDate, "EEEE d MMMM yyyy", { locale: fr })}
              </CardDescription>
            </div>
            <PollActionsMenu
              pollId={poll.id}
              title={poll.title}
              status={poll.status}
              hasMatch={Boolean(poll.matchId)}
              openAction={openPoll}
              pauseAction={pausePoll}
              closeAction={closePoll}
              reopenAction={reopenPoll}
              cancelAction={cancelPoll}
              createMatchAction={createMatchFromPoll}
              returnHref={`/admin/sondages/${poll.id}`}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Match</p>
              <p className="mt-1 text-sm font-medium">{format(poll.matchDate, "dd/MM/yyyy", { locale: fr })}</p>
            </div>
            <div className="rounded-2xl border p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Horaire</p>
              <p className="mt-1 text-sm font-medium">
                {poll.startTime} - {poll.endTime}
              </p>
            </div>
            <div className="rounded-2xl border p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Ouverture</p>
              <p className="mt-1 text-sm font-medium">{poll.opensAt ? format(poll.opensAt, "dd/MM/yyyy HH:mm", { locale: fr }) : "Non définie"}</p>
            </div>
            <div className="rounded-2xl border p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Clôture</p>
              <p className="mt-1 text-sm font-medium">{poll.closesAt ? format(poll.closesAt, "dd/MM/yyyy HH:mm", { locale: fr }) : "Non définie"}</p>
            </div>
          </div>
        </Card>

        <PollProgress present={presentCount} waitlist={waitlistCount} absent={absentCount} capacity={poll.capacity} />
        <Card>
          <CardDescription>Réponses</CardDescription>
          <CardTitle className="mt-2 text-3xl">{presentCount + waitlistCount + absentCount}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Fill rate</CardDescription>
          <CardTitle className="mt-2 text-3xl">{fillRate}%</CardTitle>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Card>
            <CardTitle>Timeline</CardTitle>
            <CardDescription className="max-w-2xl">
              Les étapes clés du sondage et son échéancier.
            </CardDescription>
            <div className="mt-4">
              <Timeline items={timelineItems} />
            </div>
          </Card>

          <Card>
            <CardTitle>Paramètres du sondage</CardTitle>
            <CardDescription className="max-w-2xl">
              Modifiez la structure du sondage et sa capacité.
            </CardDescription>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <form action={updatePoll} className="rounded-2xl border p-4 space-y-4 md:col-span-2">
                <input type="hidden" name="pollId" value={poll.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor="title">Titre</Label>
                    <Input id="title" name="title" defaultValue={poll.title} />
                  </div>
                  <div>
                    <Label htmlFor="matchTitle">Titre du match</Label>
                    <Input id="matchTitle" name="matchTitle" defaultValue={poll.matchTitle} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" defaultValue={poll.description ?? ""} />
                  </div>
                  <div>
                    <Label htmlFor="matchDate">Date du match</Label>
                    <Input id="matchDate" name="matchDate" type="date" defaultValue={poll.matchDate.toISOString().slice(0, 10)} />
                  </div>
                  <div>
                    <Label htmlFor="location">Terrain</Label>
                    <Input id="location" name="location" defaultValue={poll.location} />
                  </div>
                  <div>
                    <Label htmlFor="startTime">Heure début</Label>
                    <Input id="startTime" name="startTime" type="time" defaultValue={poll.startTime} />
                  </div>
                  <div>
                    <Label htmlFor="endTime">Heure fin</Label>
                    <Input id="endTime" name="endTime" type="time" defaultValue={poll.endTime} />
                  </div>
                  <div>
                    <Label htmlFor="capacity">Capacité</Label>
                    <Input id="capacity" name="capacity" type="number" min="1" step="1" defaultValue={poll.capacity} />
                  </div>
                  <div>
                    <Label htmlFor="matchAmount">Montant</Label>
                    <Input id="matchAmount" name="matchAmount" type="number" step="0.01" min="0" defaultValue={poll.matchAmount.toString()} />
                  </div>
                  <div>
                    <Label htmlFor="opensAt">Ouverture</Label>
                    <Input id="opensAt" name="opensAt" type="datetime-local" defaultValue={poll.opensAt ? format(poll.opensAt, "yyyy-MM-dd'T'HH:mm") : ""} />
                  </div>
                  <div>
                    <Label htmlFor="closesAt">Clôture</Label>
                    <Input id="closesAt" name="closesAt" type="datetime-local" defaultValue={poll.closesAt ? format(poll.closesAt, "yyyy-MM-dd'T'HH:mm") : ""} />
                  </div>
                  <div>
                    <Label htmlFor="status">Statut</Label>
                    <select id="status" name="status" defaultValue={poll.status} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                      <option value="DRAFT">Brouillon</option>
                      <option value="OPEN">Ouvert</option>
                      <option value="PAUSED">Suspendu</option>
                      <option value="CLOSED">Clôturé</option>
                      <option value="CANCELLED">Annulé</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="allowResponseChanges">Modification des réponses</Label>
                    <select id="allowResponseChanges" name="allowResponseChanges" defaultValue={String(poll.allowResponseChanges)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                      <option value="true">Autorisée</option>
                      <option value="false">Bloquée</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="manualControl">Contrôle manuel</Label>
                    <select id="manualControl" name="manualControl" defaultValue={String(poll.manualControl)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                      <option value="false">Automatique</option>
                      <option value="true">Manuel total</option>
                    </select>
                  </div>
                </div>
                <FormSubmitButton>Enregistrer le sondage</FormSubmitButton>
              </form>

              <form action={updatePollCapacity} className="rounded-2xl border p-4 space-y-4">
                <input type="hidden" name="pollId" value={poll.id} />
                <div>
                  <Label htmlFor="capacity">Ajuster la capacité</Label>
                  <Input id="capacity" name="capacity" type="number" min={presentCount} step="1" defaultValue={poll.capacity} />
                </div>
                <FormSubmitButton>Mettre à jour la capacité</FormSubmitButton>
              </form>
            </div>
          </Card>

          <Card>
            <CardTitle>Partager sur WhatsApp</CardTitle>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{whatsappMessage}</p>
            <div className="mt-3">
              <WhatsAppActions message={whatsappMessage} whatsappUrl={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitle>Participants</CardTitle>
            <CardDescription className="max-w-2xl">
              Glissez un joueur entre les colonnes ou utilisez les actions rapides pour ajuster son statut.
            </CardDescription>
            <div className="mt-4">
              <PollBoard
                pollId={poll.id}
                participants={poll.responses}
                moveAction={movePollParticipant}
                removeAction={removePollParticipant}
                promoteAction={promotePollParticipant}
              />
            </div>
          </Card>

          <Card>
            <CardTitle>Ajouter un joueur</CardTitle>
            <CardDescription className="max-w-2xl">
              L’ajout respecte la capacité et l’état actif du joueur.
            </CardDescription>
            <form action={addPollParticipant} className="mt-4 space-y-3 rounded-2xl border p-4">
              <input type="hidden" name="pollId" value={poll.id} />
              <Label htmlFor="userId">Joueur</Label>
              <select id="userId" name="userId" className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                {availablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} · {player.email}
                  </option>
                ))}
              </select>
              <FormSubmitButton>Ajouter le joueur</FormSubmitButton>
            </form>
          </Card>

          <Card>
            <CardTitle>Création du match</CardTitle>
            <CardDescription className="max-w-2xl">
              Le match peut être généré depuis le sondage. Les joueurs présents sont importés comme participants à confirmer.
            </CardDescription>
            <div className="mt-4 space-y-4">
              {poll.match ? (
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Match lié</p>
                  <p className="text-sm text-slate-600">{poll.match.title}</p>
                  <Button asChild className="mt-3">
                    <Link href={`/admin/matchs/${poll.match.id}`}>Ouvrir le match</Link>
                  </Button>
                </div>
              ) : (
                <form action={createMatchFromPoll} className="rounded-2xl border p-4">
                  <input type="hidden" name="pollId" value={poll.id} />
                  <ConfirmButton type="submit" message={`Créer le match à partir de ${poll.title} ?`}>
                    Créer le match depuis le sondage
                  </ConfirmButton>
                </form>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle>Statistiques du sondage</CardTitle>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-600">Présents</p>
                <p className="mt-1 text-xl font-semibold">{presentCount}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-600">Peut-être</p>
                <p className="mt-1 text-xl font-semibold">{maybeCount}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-600">Absents</p>
                <p className="mt-1 text-xl font-semibold">{absentCount}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-600">Match lié</p>
                <p className="mt-1 text-xl font-semibold">{poll.matchId ? "Oui" : "Non"}</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="ghost">
          <Link href="/admin/sondages">Retour à la liste</Link>
        </Button>
      </div>
    </div>
  );
}
