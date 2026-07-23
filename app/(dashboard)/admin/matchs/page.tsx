import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MatchStatus, Prisma } from "@prisma/client";
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
import { cancelMatch } from "@/app/actions/matches";
import { canManageSport } from "@/lib/permissions";
import { redirect } from "next/navigation";

type QueryParams = Record<string, string | string[] | undefined>;

type MatchRow = {
  id: string;
  title: string;
  matchDate: Date;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  participationFee: Prisma.Decimal;
  status: MatchStatus;
  bookingReference: string | null;
  participants: Array<{ status: "INVITED" | "CONFIRMED" | "WAITLISTED" | "CANCELLED" | "ABSENT" | "ATTENDED" }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeQuery(searchParams?: QueryParams | Promise<QueryParams>) {
  return Promise.resolve(searchParams ?? {}).then((params) => ({
    q: firstValue(params.q)?.trim() ?? "",
    status: firstValue(params.status) ?? "all",
    period: firstValue(params.period) ?? "all",
    sort: firstValue(params.sort) ?? "date_asc",
    page: Math.max(1, Number(firstValue(params.page) ?? "1") || 1),
    success: firstValue(params.success),
    error: firstValue(params.error)
  }));
}

function buildHref(base: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return query ? `${base}?${query}` : base;
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
    case MatchStatus.COMPLETED:
      return "default";
    case MatchStatus.CANCELLED:
      return "danger";
    case MatchStatus.DRAFT:
    default:
      return "default";
  }
}

function matchesSearch(match: MatchRow, term: string) {
  if (!term) return true;
  const needle = term.toLowerCase();
  return [match.title, match.location, match.bookingReference ?? ""].some((value) => value.toLowerCase().includes(needle));
}

function matchPeriod(match: MatchRow, period: string) {
  if (period === "upcoming") return match.matchDate.getTime() >= new Date().setHours(0, 0, 0, 0);
  if (period === "past") return match.matchDate.getTime() < new Date().setHours(0, 0, 0, 0);
  return true;
}

function sortMatches(matches: MatchRow[], sort: string) {
  const sorted = [...matches];
  switch (sort) {
    case "date_desc":
      return sorted.sort((a, b) => b.matchDate.getTime() - a.matchDate.getTime());
    case "confirmed_desc":
      return sorted.sort((a, b) => b.participants.filter((participant) => participant.status === "CONFIRMED").length - a.participants.filter((participant) => participant.status === "CONFIRMED").length);
    case "waitlist_desc":
      return sorted.sort((a, b) => b.participants.filter((participant) => participant.status === "WAITLISTED").length - a.participants.filter((participant) => participant.status === "WAITLISTED").length);
    case "capacity_desc":
      return sorted.sort((a, b) => b.capacity - a.capacity);
    case "fee_desc":
      return sorted.sort((a, b) => Number(b.participationFee ?? 0) - Number(a.participationFee ?? 0));
    case "status_asc":
      return sorted.sort((a, b) => a.status.localeCompare(b.status, "fr"));
    case "date_asc":
    default:
      return sorted.sort((a, b) => a.matchDate.getTime() - b.matchDate.getTime());
  }
}

function emptyLabel(label: string) {
  return <div className="rounded-xl border border-dashed px-4 py-4 text-sm text-slate-500">{label}</div>;
}

export default async function AdminMatchesPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canManageSport(session.user.role)) redirect("/espace");

  const { q, status, period, sort, page, success, error } = await normalizeQuery(searchParams);

  const rawMatches = await prisma.match.findMany({
    orderBy: { matchDate: "asc" },
    include: {
      participants: {
        select: { status: true }
      }
    }
  });

  const matches: MatchRow[] = rawMatches;
  const filtered = matches.filter((match) => {
    const statusMatch = status === "all" ? true : match.status.toLowerCase() === status;
    return statusMatch && matchesSearch(match, q) && matchPeriod(match, period);
  });

  const sorted = sortMatches(filtered, sort);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleMatches = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const nowStart = new Date();
  nowStart.setHours(0, 0, 0, 0);
  const upcomingCount = matches.filter((match) => match.matchDate.getTime() >= nowStart.getTime() && match.status !== MatchStatus.CANCELLED).length;
  const cancelledCount = matches.filter((match) => match.status === MatchStatus.CANCELLED).length;

  const sharedParams = { q, status, period, sort };

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardDescription>Total matchs</CardDescription>
          <CardTitle className="mt-2 text-3xl">{matches.length}</CardTitle>
        </Card>
        <Card>
          <CardDescription>À venir</CardDescription>
          <CardTitle className="mt-2 text-3xl">{upcomingCount}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Annulés</CardDescription>
          <CardTitle className="mt-2 text-3xl">{cancelledCount}</CardTitle>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Gestion des matchs</CardTitle>
            <CardDescription className="max-w-2xl">
              Recherchez un match, filtrez les statuts, triez la liste et accédez aux actions administratives.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin/matchs/nouveau">Nouveau match</Link>
          </Button>
        </div>

        <form method="get" className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label htmlFor="q">Recherche</Label>
            <Input id="q" name="q" defaultValue={q} placeholder="Titre, terrain ou référence" />
          </div>
          <div>
            <Label htmlFor="status">Statut</Label>
            <select id="status" name="status" defaultValue={status} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              <option value="all">Tous</option>
              <option value="draft">Brouillon</option>
              <option value="open">Ouvert</option>
              <option value="full">Complet</option>
              <option value="confirmed">Confirmé</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
          <div>
            <Label htmlFor="period">Période</Label>
            <select id="period" name="period" defaultValue={period} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              <option value="all">Toutes</option>
              <option value="upcoming">À venir</option>
              <option value="past">Passées</option>
            </select>
          </div>
          <div>
            <Label htmlFor="sort">Tri</Label>
            <select id="sort" name="sort" defaultValue={sort} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              <option value="date_asc">Date croissante</option>
              <option value="date_desc">Date décroissante</option>
              <option value="confirmed_desc">Confirmés</option>
              <option value="waitlist_desc">Liste d’attente</option>
              <option value="capacity_desc">Capacité</option>
              <option value="fee_desc">Prix décroissant</option>
              <option value="status_asc">Statut</option>
            </select>
          </div>
          <div className="md:col-span-4 flex flex-wrap gap-3">
            <Button type="submit">Appliquer</Button>
            <Button asChild variant="ghost">
              <Link href="/admin/matchs">Réinitialiser</Link>
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Liste des matchs</CardTitle>
        <div className="mt-4 overflow-hidden rounded-2xl border">
          <table className="hidden w-full text-left text-sm md:table">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Horaire</th>
                <th className="px-4 py-3">Terrain</th>
                <th className="px-4 py-3">Capacité</th>
                <th className="px-4 py-3">Confirmés</th>
                <th className="px-4 py-3">Liste d’attente</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Prix/joueur</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleMatches.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={9}>
                    Aucun match ne correspond à ces critères.
                  </td>
                </tr>
              ) : (
                visibleMatches.map((match) => {
                  const confirmedCount = match.participants.filter((participant) => participant.status === "CONFIRMED").length;
                  const waitlistCount = match.participants.filter((participant) => participant.status === "WAITLISTED").length;

                  return (
                    <tr key={match.id} className="border-t align-top">
                      <td className="px-4 py-3">{format(match.matchDate, "dd/MM/yyyy", { locale: fr })}</td>
                      <td className="px-4 py-3">
                        {match.startTime} - {match.endTime}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{match.title}</div>
                        <div className="text-xs text-slate-500">{match.location}</div>
                      </td>
                      <td className="px-4 py-3">{match.capacity}</td>
                      <td className="px-4 py-3">
                        {confirmedCount}/{match.capacity}
                      </td>
                      <td className="px-4 py-3">{waitlistCount}</td>
                      <td className="px-4 py-3">
                        <Badge variant={matchStatusVariant(match.status)}>{matchStatusLabel(match.status)}</Badge>
                      </td>
                      <td className="px-4 py-3">{formatDh(match.participationFee)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="ghost">
                            <Link href={`/admin/matchs/${match.id}`}>Voir</Link>
                          </Button>
                          {match.status !== MatchStatus.CANCELLED ? (
                            <form action={cancelMatch}>
                              <input type="hidden" name="matchId" value={match.id} />
                              <ConfirmButton
                                type="submit"
                                variant="destructive"
                                message={`Annuler ${match.title} et rembourser les joueurs payés ?`}
                              >
                                Annuler
                              </ConfirmButton>
                            </form>
                          ) : (
                            <Badge variant="danger">Annulé</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="space-y-3 p-3 md:hidden">
            {visibleMatches.length === 0 ? (
              emptyLabel("Aucun match ne correspond à ces critères.")
            ) : (
              visibleMatches.map((match) => {
                const confirmedCount = match.participants.filter((participant) => participant.status === "CONFIRMED").length;
                const waitlistCount = match.participants.filter((participant) => participant.status === "WAITLISTED").length;

                return (
                  <div key={match.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{match.title}</p>
                        <p className="text-sm text-slate-600">
                          {format(match.matchDate, "EEEE d MMMM yyyy", { locale: fr })} · {match.startTime} - {match.endTime}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{match.location}</p>
                      </div>
                      <Badge variant={matchStatusVariant(match.status)}>{matchStatusLabel(match.status)}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <p>Capacité: {match.capacity}</p>
                      <p>Confirmés: {confirmedCount}</p>
                      <p>Liste d’attente: {waitlistCount}</p>
                      <p>Prix/joueur: {formatDh(match.participationFee)}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild variant="ghost">
                        <Link href={`/admin/matchs/${match.id}`}>Voir</Link>
                      </Button>
                      {match.status !== MatchStatus.CANCELLED ? (
                        <form action={cancelMatch}>
                          <input type="hidden" name="matchId" value={match.id} />
                          <ConfirmButton
                            type="submit"
                            variant="destructive"
                            message={`Annuler ${match.title} et rembourser les joueurs payés ?`}
                          >
                            Annuler
                          </ConfirmButton>
                        </form>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
          <p>
            Page {currentPage} sur {totalPages}
          </p>
          <div className="flex gap-2">
            {currentPage > 1 ? (
              <Button asChild variant="ghost">
                <Link href={buildHref("/admin/matchs", { ...sharedParams, page: String(currentPage - 1) })}>Précédent</Link>
              </Button>
            ) : (
              <Button variant="ghost" disabled>
                Précédent
              </Button>
            )}
            {currentPage < totalPages ? (
              <Button asChild variant="ghost">
                <Link href={buildHref("/admin/matchs", { ...sharedParams, page: String(currentPage + 1) })}>Suivant</Link>
              </Button>
            ) : (
              <Button variant="ghost" disabled>
                Suivant
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
