import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MatchPaymentStatus, MatchParticipantStatus, MatchStatus, Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoticeBanner } from "@/components/notice-banner";
import { ConfirmButton } from "@/components/confirm-button";
import {
  addParticipant,
  addParticipantToWaitlist,
  cancelMatch,
  cancelParticipation,
  confirmParticipant,
  markParticipantAttendance,
  promoteWaitlistedParticipant,
  updateMatch
} from "@/app/actions/matches";

type QueryParams = Record<string, string | string[] | undefined>;

const editableStatuses = [MatchStatus.DRAFT, MatchStatus.OPEN, MatchStatus.FULL, MatchStatus.CONFIRMED, MatchStatus.COMPLETED] as const;
const participantOrder: Record<MatchParticipantStatus, number> = {
  INVITED: 0,
  CONFIRMED: 1,
  WAITLISTED: 2,
  ATTENDED: 3,
  ABSENT: 4,
  CANCELLED: 5
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function emptyLabel(label: string) {
  return <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-slate-500">{label}</div>;
}

function dateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function matchStatusLabel(status: MatchStatus) {
  switch (status) {
    case MatchStatus.DRAFT:
      return "Brouillon";
    case MatchStatus.OPEN:
      return "Ouvert";
    case MatchStatus.FULL:
      return "Complet";
    case MatchStatus.CONFIRMED:
      return "Confirmé";
    case MatchStatus.COMPLETED:
      return "Terminé";
    case MatchStatus.CANCELLED:
      return "Annulé";
  }
}

function matchStatusVariant(status: MatchStatus): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case MatchStatus.OPEN:
      return "success";
    case MatchStatus.FULL:
      return "warning";
    case MatchStatus.CONFIRMED:
      return "info";
    case MatchStatus.CANCELLED:
      return "danger";
    default:
      return "default";
  }
}

function participantStatusLabel(status: MatchParticipantStatus) {
  switch (status) {
    case MatchParticipantStatus.INVITED:
      return "Invité";
    case MatchParticipantStatus.CONFIRMED:
      return "Confirmé";
    case MatchParticipantStatus.WAITLISTED:
      return "En attente";
    case MatchParticipantStatus.CANCELLED:
      return "Annulé";
    case MatchParticipantStatus.ABSENT:
      return "Absent";
    case MatchParticipantStatus.ATTENDED:
      return "Présent";
  }
}

function participantStatusVariant(status: MatchParticipantStatus): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case MatchParticipantStatus.CONFIRMED:
    case MatchParticipantStatus.ATTENDED:
      return "success";
    case MatchParticipantStatus.WAITLISTED:
      return "warning";
    case MatchParticipantStatus.CANCELLED:
      return "danger";
    case MatchParticipantStatus.ABSENT:
      return "info";
    default:
      return "default";
  }
}

function paymentStatusLabel(status: MatchPaymentStatus) {
  switch (status) {
    case MatchPaymentStatus.PAID:
      return "Payé";
    case MatchPaymentStatus.REFUNDED:
      return "Remboursé";
    case MatchPaymentStatus.FAILED:
      return "Échec";
    case MatchPaymentStatus.NOT_REQUIRED:
      return "Non requis";
    case MatchPaymentStatus.PENDING:
    default:
      return "En attente";
  }
}

function paymentStatusVariant(status: MatchPaymentStatus): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case MatchPaymentStatus.PAID:
      return "success";
    case MatchPaymentStatus.REFUNDED:
      return "info";
    case MatchPaymentStatus.FAILED:
      return "danger";
    case MatchPaymentStatus.PENDING:
      return "warning";
    case MatchPaymentStatus.NOT_REQUIRED:
    default:
      return "default";
  }
}

export default async function AdminMatchDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<QueryParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!session.user.isAdmin) redirect("/espace");

  const { id } = await Promise.resolve(params);
  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);

  const [match, activePlayers] = await Promise.all([
    prisma.match.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              include: { wallet: true }
            }
          }
        }
      }
    }),
    prisma.user.findMany({
      where: { role: Role.PLAYER, isActive: true },
      orderBy: { name: "asc" },
      include: { wallet: true }
    })
  ]);

  if (!match) {
    notFound();
  }

  const sortedParticipants = [...match.participants].sort((a, b) => {
    const statusDelta = participantOrder[a.status] - participantOrder[b.status];
    if (statusDelta !== 0) return statusDelta;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const confirmedCount = match.participants.filter((participant) => participant.status === MatchParticipantStatus.CONFIRMED).length;
  const waitlistCount = match.participants.filter((participant) => participant.status === MatchParticipantStatus.WAITLISTED).length;
  const paidCount = match.participants.filter((participant) => participant.paymentStatus === MatchPaymentStatus.PAID).length;
  const actionsAllowed = match.status !== MatchStatus.CANCELLED && match.status !== MatchStatus.COMPLETED;

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardDescription>Statut</CardDescription>
          <CardTitle className="mt-2 text-3xl">{matchStatusLabel(match.status)}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Confirmés</CardDescription>
          <CardTitle className="mt-2 text-3xl">
            {confirmedCount}/{match.capacity}
          </CardTitle>
        </Card>
        <Card>
          <CardDescription>Liste d’attente</CardDescription>
          <CardTitle className="mt-2 text-3xl">{waitlistCount}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Paiements réglés</CardDescription>
          <CardTitle className="mt-2 text-3xl">{paidCount}</CardTitle>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardTitle>Fiche du match</CardTitle>
          <CardDescription className="max-w-2xl">
            Modifiez les informations du match. L’annulation se fait via l’action dédiée pour garantir les remboursements.
          </CardDescription>
          <form action={updateMatch} className="mt-4 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="matchId" value={match.id} />
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input id="title" name="title" defaultValue={match.title} required />
            </div>
            <div>
              <Label htmlFor="matchDate">Date</Label>
              <Input id="matchDate" name="matchDate" type="date" defaultValue={dateInputValue(match.matchDate)} required />
            </div>
            <div>
              <Label htmlFor="startTime">Heure de début</Label>
              <Input id="startTime" name="startTime" type="time" defaultValue={match.startTime} required />
            </div>
            <div>
              <Label htmlFor="endTime">Heure de fin</Label>
              <Input id="endTime" name="endTime" type="time" defaultValue={match.endTime} required />
            </div>
            <div>
              <Label htmlFor="location">Terrain</Label>
              <Input id="location" name="location" defaultValue={match.location} required />
            </div>
            <div>
              <Label htmlFor="bookingReference">Référence Rabat Animation</Label>
              <Input id="bookingReference" name="bookingReference" defaultValue={match.bookingReference ?? ""} placeholder="Facultatif" />
            </div>
            <div>
              <Label htmlFor="capacity">Capacité</Label>
              <Input id="capacity" name="capacity" type="number" min="1" defaultValue={match.capacity} required />
            </div>
            <div>
              <Label htmlFor="participationFee">Prix par joueur</Label>
              <Input id="participationFee" name="participationFee" type="number" min="0" step="0.01" defaultValue={Number(match.participationFee)} />
            </div>
            <div>
              <Label htmlFor="cancellationDeadline">Date limite d’annulation</Label>
              <Input id="cancellationDeadline" name="cancellationDeadline" type="date" defaultValue={dateInputValue(match.cancellationDeadline)} />
            </div>
            <div>
              <Label htmlFor="status">Statut</Label>
              {match.status === MatchStatus.CANCELLED ? (
                <>
                  <input type="hidden" name="status" value="CANCELLED" />
                  <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-600">Annulé</div>
                </>
              ) : (
                <select id="status" name="status" defaultValue={match.status} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                  {editableStatuses.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {matchStatusLabel(statusOption)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                defaultValue={match.notes ?? ""}
                className="min-h-32 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                placeholder="Notes internes"
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <Button type="submit">Enregistrer</Button>
              {match.status === MatchStatus.CANCELLED ? <Badge variant="danger">Match annulé</Badge> : null}
            </div>
          </form>
          {match.status !== MatchStatus.CANCELLED ? (
            <div className="mt-4">
              <form action={cancelMatch}>
                <input type="hidden" name="matchId" value={match.id} />
                <ConfirmButton
                  type="submit"
                  variant="destructive"
                  message={`Annuler définitivement ${match.title} et rembourser les joueurs payés ?`}
                >
                  Annuler le match
                </ConfirmButton>
              </form>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardTitle>Résumé</CardTitle>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Date</p>
              <p className="font-medium">{format(match.matchDate, "EEEE d MMMM yyyy", { locale: fr })}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Horaire</p>
              <p className="font-medium">
                {match.startTime} - {match.endTime}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Terrain</p>
              <p className="font-medium">{match.location}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Prix</p>
              <p className="font-medium">{formatDh(match.participationFee)}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Réservation</p>
              <p className="font-medium">{match.bookingReference ?? "Aucune"}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Date limite</p>
              <p className="font-medium">{match.cancellationDeadline ? format(match.cancellationDeadline, "dd/MM/yyyy", { locale: fr }) : "Aucune"}</p>
            </div>
          </div>
          <div className="mt-4">
            <Badge variant={matchStatusVariant(match.status)}>{matchStatusLabel(match.status)}</Badge>
          </div>
          {match.notes ? (
            <div className="mt-4 rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
              {match.notes}
            </div>
          ) : null}
        </Card>
      </section>

      <Card>
        <CardTitle>Ajouter un joueur</CardTitle>
        <CardDescription className="max-w-3xl">
          Le solde affiché est celui du joueur au moment de la confirmation. Vous pouvez l’ajouter, le confirmer avec débit automatique ou le placer en liste d’attente.
        </CardDescription>
        {actionsAllowed ? (
          <div className="mt-4 hidden overflow-hidden rounded-2xl border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Joueur</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Téléphone</th>
                  <th className="px-4 py-3">Solde</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activePlayers.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                      Aucun joueur actif disponible.
                    </td>
                  </tr>
                ) : (
                  activePlayers.map((player) => (
                    <tr key={player.id} className="border-t align-top">
                      <td className="px-4 py-3 font-medium">{player.name}</td>
                      <td className="px-4 py-3">{player.email}</td>
                      <td className="px-4 py-3">{player.phone ?? "—"}</td>
                      <td className="px-4 py-3">{formatDh(player.wallet?.balance ?? 0)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <form action={addParticipant}>
                            <input type="hidden" name="matchId" value={match.id} />
                            <input type="hidden" name="userId" value={player.id} />
                            <Button type="submit" variant="ghost">Ajouter</Button>
                          </form>
                          <form action={confirmParticipant}>
                            <input type="hidden" name="matchId" value={match.id} />
                            <input type="hidden" name="userId" value={player.id} />
                            <Button type="submit">Confirmer</Button>
                          </form>
                          <form action={addParticipantToWaitlist}>
                            <input type="hidden" name="matchId" value={match.id} />
                            <input type="hidden" name="userId" value={player.id} />
                            <Button type="submit" variant="secondary">Liste d’attente</Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed px-4 py-3 text-sm text-slate-500">
            Ce match est fermé, les actions sur les participants ne sont plus disponibles.
          </div>
        )}

        {actionsAllowed ? (
          <div className="mt-4 space-y-3 md:hidden">
            {activePlayers.length === 0 ? (
              emptyLabel("Aucun joueur actif disponible.")
            ) : (
              activePlayers.map((player) => (
                <div key={player.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{player.name}</p>
                      <p className="text-sm text-slate-600">{player.email}</p>
                    </div>
                    <Badge>{formatDh(player.wallet?.balance ?? 0)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={addParticipant}>
                      <input type="hidden" name="matchId" value={match.id} />
                      <input type="hidden" name="userId" value={player.id} />
                      <Button type="submit" variant="ghost">Ajouter</Button>
                    </form>
                    <form action={confirmParticipant}>
                      <input type="hidden" name="matchId" value={match.id} />
                      <input type="hidden" name="userId" value={player.id} />
                      <Button type="submit">Confirmer</Button>
                    </form>
                    <form action={addParticipantToWaitlist}>
                      <input type="hidden" name="matchId" value={match.id} />
                      <input type="hidden" name="userId" value={player.id} />
                      <Button type="submit" variant="secondary">Liste d’attente</Button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </Card>

      <Card>
        <CardTitle>Participants</CardTitle>
        <div className="mt-4 overflow-hidden rounded-2xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Joueur</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Paiement</th>
                <th className="px-4 py-3">Solde</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedParticipants.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    Aucun participant pour le moment.
                  </td>
                </tr>
              ) : (
                sortedParticipants.map((participant) => {
                  const currentBalance = participant.user.wallet?.balance ?? 0;
                  return (
                    <tr key={participant.id} className="border-t align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">{participant.user.name}</div>
                        <div className="text-xs text-slate-500">{participant.user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={participantStatusVariant(participant.status)}>{participantStatusLabel(participant.status)}</Badge>
                        <div className="mt-2 text-xs text-slate-500">Depuis le {format(participant.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={paymentStatusVariant(participant.paymentStatus)}>{paymentStatusLabel(participant.paymentStatus)}</Badge>
                        <div className="mt-2 text-xs text-slate-500">Montant: {formatDh(participant.amountCharged)}</div>
                      </td>
                      <td className="px-4 py-3">{formatDh(currentBalance)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {participant.status === MatchParticipantStatus.WAITLISTED && actionsAllowed ? (
                            <form action={promoteWaitlistedParticipant}>
                              <input type="hidden" name="participantId" value={participant.id} />
                              <input type="hidden" name="matchId" value={match.id} />
                              <ConfirmButton type="submit" message={`Promouvoir ${participant.user.name} depuis la liste d’attente ?`}>
                                Promouvoir
                              </ConfirmButton>
                            </form>
                          ) : null}
                          {participant.status !== MatchParticipantStatus.CANCELLED && actionsAllowed ? (
                            <form action={cancelParticipation}>
                              <input type="hidden" name="matchId" value={match.id} />
                              <input type="hidden" name="userId" value={participant.userId} />
                              <ConfirmButton type="submit" variant="destructive" message={`Annuler la participation de ${participant.user.name} ?`}>
                                Annuler
                              </ConfirmButton>
                            </form>
                          ) : null}
                          {actionsAllowed && (participant.status === MatchParticipantStatus.CONFIRMED || participant.status === MatchParticipantStatus.ATTENDED || participant.status === MatchParticipantStatus.ABSENT) ? (
                            <form action={markParticipantAttendance} className="flex flex-wrap gap-2">
                              <input type="hidden" name="participantId" value={participant.id} />
                              <input type="hidden" name="matchId" value={match.id} />
                              <Button type="submit" name="attendanceStatus" value="ATTENDED" variant="ghost">
                                Présent
                              </Button>
                              <Button type="submit" name="attendanceStatus" value="ABSENT" variant="ghost">
                                Absent
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="ghost">
          <Link href="/admin/matchs">Retour à la liste</Link>
        </Button>
      </div>
    </div>
  );
}
