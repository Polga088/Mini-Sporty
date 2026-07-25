import { auth } from "@/auth";
import { NoticeBanner } from "@/components/notice-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { formatDh } from "@/lib/money";
import { canManageSport } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { verifyPresenceToken } from "@/lib/presence";
import { confirmPresenceByToken, markPresenceManually } from "@/app/actions/presence";
import { MatchParticipantStatus, MatchStatus, PresenceSource } from "@prisma/client";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseToken(token: string) {
  const [tokenId] = token.split(".");
  return tokenId ?? "";
}

function statusLabel(status: MatchStatus) {
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

function participantLabel(status: MatchParticipantStatus) {
  switch (status) {
    case MatchParticipantStatus.ATTENDED:
      return "Présent";
    case MatchParticipantStatus.ABSENT:
      return "Absent";
    case MatchParticipantStatus.CONFIRMED:
      return "Confirmé";
    case MatchParticipantStatus.WAITLISTED:
      return "Liste d’attente";
    case MatchParticipantStatus.CANCELLED:
      return "Annulé";
    case MatchParticipantStatus.INVITED:
      return "Invité";
  }
}

function sourceLabel(source: PresenceSource) {
  return source === PresenceSource.QR ? "QR" : "MANUEL";
}

export default async function PresencePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<QueryParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const { token } = await Promise.resolve(params);
  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);
  const tokenId = parseToken(token);

  if (!tokenId) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <NoticeBanner success={success} error={error} />
          <Card>
            <CardTitle>QR invalide</CardTitle>
            <CardDescription>Le lien scanné n’est pas exploitable.</CardDescription>
          </Card>
        </div>
      </main>
    );
  }

  const match = await prisma.match.findFirst({
    where: { qrTokenId: tokenId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, wallet: true } }
        }
      },
      presenceLogs: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true } },
          actor: { select: { name: true } }
        }
      }
    }
  });

  const isStaff = canManageSport(session.user.role);
  const currentParticipant = match?.participants.find((participant) => participant.userId === session.user.id) ?? null;
  const tokenIsValid = Boolean(
    match &&
      match.qrTokenExpiresAt &&
      !match.qrDisabledAt &&
      verifyPresenceToken(match.id, tokenId, token, match.qrTokenExpiresAt) &&
      match.status !== MatchStatus.CANCELLED &&
      match.status !== MatchStatus.COMPLETED
  );
  const presentParticipants = match?.participants.filter((participant) => participant.status === MatchParticipantStatus.ATTENDED) ?? [];
  const canConfirm = Boolean(tokenIsValid && currentParticipant && currentParticipant.status !== MatchParticipantStatus.WAITLISTED && currentParticipant.status !== MatchParticipantStatus.CANCELLED && currentParticipant.status !== MatchParticipantStatus.ATTENDED);

  const statusTone: "danger" | "success" | "info" = !match || !tokenIsValid ? "danger" : match.status === MatchStatus.OPEN ? "success" : "info";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#ffffff_80%)] px-4 py-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <NoticeBanner success={success} error={error} />

        <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardDescription>Présence par QR</CardDescription>
                <CardTitle className="mt-2 text-3xl">{match?.title ?? "QR introuvable"}</CardTitle>
              </div>
              <Badge variant={statusTone}>{match ? statusLabel(match.status) : "Invalide"}</Badge>
            </div>

            {match ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="mt-1 font-medium">{format(match.matchDate, "EEEE d MMMM yyyy", { locale: fr })}</p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs text-slate-500">Horaire</p>
                  <p className="mt-1 font-medium">
                    {match.startTime} - {match.endTime}
                  </p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs text-slate-500">Terrain</p>
                  <p className="mt-1 font-medium">{match.location}</p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs text-slate-500">Montant</p>
                  <p className="mt-1 font-medium">{formatDh(match.participationFee)}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">Aucun match associé à ce QR.</p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {canConfirm ? (
                <form action={confirmPresenceByToken}>
                  <input type="hidden" name="token" value={token} />
                  <ConfirmButton type="submit" message="Confirmer votre présence sur ce match ?">
                    Confirmer ma présence
                  </ConfirmButton>
                </form>
              ) : null}
              {match ? (
                <Button asChild variant="ghost">
                  <a href={`/presence/${token}`} target="_self">
                    Rafraîchir
                  </a>
                </Button>
              ) : null}
            </div>

            {!tokenIsValid && match ? (
              <div className="mt-4 rounded-2xl border border-dashed bg-amber-50 p-4 text-sm text-amber-900">
                Ce QR est invalide, expiré, désactivé ou le match est terminé.
              </div>
            ) : null}
            {currentParticipant && !canConfirm ? (
              <div className="mt-4 rounded-2xl border border-dashed bg-slate-50 p-4 text-sm text-slate-700">
                Votre statut actuel est <strong>{participantLabel(currentParticipant.status)}</strong>. Aucune confirmation supplémentaire n’est nécessaire.
              </div>
            ) : null}
            {!currentParticipant && match && !isStaff ? (
              <div className="mt-4 rounded-2xl border border-dashed bg-red-50 p-4 text-sm text-red-900">
                Vous n’êtes pas inscrit à ce match.
              </div>
            ) : null}
          </Card>

          <Card>
            <CardDescription>Présents</CardDescription>
            <CardTitle className="mt-2 text-3xl">{presentParticipants.length}</CardTitle>
            <p className="mt-2 text-sm text-slate-600">Mise à jour au prochain rafraîchissement ou après confirmation.</p>

            <div className="mt-4 space-y-2">
              {presentParticipants.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-slate-500">Aucune présence validée pour le moment.</div>
              ) : (
                presentParticipants.map((participant) => (
                  <div key={participant.id} className="rounded-2xl border bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{participant.user.name}</p>
                        <p className="text-xs text-slate-500">{participant.user.email}</p>
                      </div>
                      <Badge variant="success">Présent</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>

        {isStaff && match ? (
          <Card>
            <CardTitle>Correction manuelle</CardTitle>
            <CardDescription className="max-w-2xl">
              ADMIN et CAPTAIN peuvent corriger le statut de présence sans passer par le QR. Chaque action est journalisée.
            </CardDescription>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {match.participants.map((participant) => (
                <div key={participant.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{participant.user.name}</p>
                      <p className="text-xs text-slate-500">{participant.user.email}</p>
                      <p className="mt-2 text-xs text-slate-500">Statut: {participantLabel(participant.status)}</p>
                    </div>
                    <Badge variant={participant.status === MatchParticipantStatus.ATTENDED ? "success" : participant.status === MatchParticipantStatus.ABSENT ? "info" : "default"}>
                      {participantLabel(participant.status)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={markPresenceManually}>
                      <input type="hidden" name="matchId" value={match.id} />
                      <input type="hidden" name="participantId" value={participant.id} />
                      <input type="hidden" name="attendanceStatus" value="ATTENDED" />
                      <Button type="submit" variant="ghost">
                        Marquer présent
                      </Button>
                    </form>
                    <form action={markPresenceManually}>
                      <input type="hidden" name="matchId" value={match.id} />
                      <input type="hidden" name="participantId" value={participant.id} />
                      <input type="hidden" name="attendanceStatus" value="ABSENT" />
                      <Button type="submit" variant="ghost">
                        Marquer absent
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {isStaff && match ? (
          <Card>
            <CardTitle>Journal des présences</CardTitle>
            <div className="mt-4 space-y-3">
              {match.presenceLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-slate-500">Aucun événement journalisé.</div>
              ) : (
                match.presenceLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl border bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{log.user.name}</p>
                        <p className="text-xs text-slate-500">
                          {format(log.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })} · {sourceLabel(log.source)}
                        </p>
                      </div>
                      <Badge variant={log.source === PresenceSource.QR ? "success" : "info"}>{sourceLabel(log.source)}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
