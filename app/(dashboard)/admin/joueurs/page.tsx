import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RotateCcw } from "lucide-react";
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
import { PlayerActionsMenu } from "@/components/player-actions-menu";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PlayerRecruitCard } from "@/components/player-recruit-card";
import { createPlayer, deletePlayer, disablePlayer, enablePlayer, resetPlayerPassword } from "@/app/actions/players";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";

type QueryParams = Record<string, string | string[] | undefined>;

type PlayerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  wallet: { balance: unknown } | null;
  _count: { participatedMatches: number };
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeQuery(searchParams?: QueryParams | Promise<QueryParams>) {
  return Promise.resolve(searchParams ?? {}).then((params) => ({
    q: firstValue(params.q)?.trim() ?? "",
    status: firstValue(params.status) ?? "all",
    sort: firstValue(params.sort) ?? "name_asc",
    page: Math.max(1, Number(firstValue(params.page) ?? "1") || 1),
    success: firstValue(params.success),
    error: firstValue(params.error)
  }));
}

function matchesSearch(player: { name: string; email: string; phone: string | null }, term: string) {
  if (!term) return true;
  const needle = term.toLowerCase();
  return [player.name, player.email, player.phone ?? ""].some((value) => value.toLowerCase().includes(needle));
}

function sortPlayers(players: Array<PlayerRow>, sort: string) {
  const sorted = [...players];
  switch (sort) {
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name, "fr"));
    case "created_desc":
      return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    case "balance_desc":
      return sorted.sort((a, b) => Number(b.wallet?.balance ?? 0) - Number(a.wallet?.balance ?? 0));
    case "balance_asc":
      return sorted.sort((a, b) => Number(a.wallet?.balance ?? 0) - Number(b.wallet?.balance ?? 0));
    case "matches_desc":
      return sorted.sort((a, b) => b._count.participatedMatches - a._count.participatedMatches);
    case "created_asc":
      return sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    case "name_asc":
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }
}

function buildHref(base: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

function activeFilterLabel(status: string) {
  if (status === "active") return "Actifs";
  if (status === "inactive") return "Inactifs";
  return "Tous";
}

function emptyLabel(label: string) {
  return <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-slate-500">{label}</div>;
}

export default async function PlayersAdminPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");

  const { q, status, sort, page, success, error } = await normalizeQuery(searchParams);

  const players = await prisma.user.findMany({
    where: { role: Role.PLAYER },
    orderBy: { name: "asc" },
    include: {
      wallet: true,
      _count: {
        select: { participatedMatches: true }
      }
    }
  });

  const filtered = players.filter((player) => {
    const statusMatch = status === "active" ? player.isActive : status === "inactive" ? !player.isActive : true;
    return statusMatch && matchesSearch(player, q);
  });

  const sorted = sortPlayers(filtered, sort);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visiblePlayers = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const sharedParams = { q, status, sort };

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardDescription>Joueurs</CardDescription>
          <CardTitle className="mt-2 text-3xl">{players.length}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Filtre courant</CardDescription>
          <CardTitle className="mt-2 text-3xl">{activeFilterLabel(status)}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Page</CardDescription>
          <CardTitle className="mt-2 text-3xl">
            {currentPage}/{totalPages}
          </CardTitle>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Filtrer les joueurs</CardTitle>
            <CardDescription className="max-w-2xl">
              Recherchez par nom, email ou téléphone, triez par solde ou activité, puis ouvrez les actions depuis le menu.
            </CardDescription>
          </div>
        </div>

        <form method="get" className="mt-4 grid min-w-0 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label htmlFor="q">Recherche</Label>
            <Input id="q" name="q" defaultValue={q} placeholder="Nom, email ou téléphone" autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="status">Statut</Label>
            <select id="status" name="status" defaultValue={status} className="w-full min-w-0 rounded-xl border bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
              <option value="all">Tous</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
          <div>
            <Label htmlFor="sort">Tri</Label>
            <select id="sort" name="sort" defaultValue={sort} className="w-full min-w-0 rounded-xl border bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
              <option value="name_asc">Nom A-Z</option>
              <option value="name_desc">Nom Z-A</option>
              <option value="balance_desc">Solde décroissant</option>
              <option value="balance_asc">Solde croissant</option>
              <option value="matches_desc">Nombre de matchs</option>
              <option value="created_desc">Création récente</option>
              <option value="created_asc">Création ancienne</option>
            </select>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:col-span-4">
            <FormSubmitButton className="w-full sm:w-auto">Appliquer</FormSubmitButton>
            <Button variant="outline" type="button" asChild className="w-full gap-2 sm:w-auto">
              <Link href="/admin/joueurs">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Réinitialiser
              </Link>
            </Button>
          </div>
        </form>
      </Card>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        <PlayerRecruitCard />

        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Étape 1 sur 1</p>
              <CardTitle className="mt-2 text-2xl tracking-[-0.04em] sm:text-3xl">Nouveau joueur</CardTitle>
              <CardDescription className="max-w-xl text-base leading-6">
                Prêt à rejoindre l’équipe ?
              </CardDescription>
            </div>
            <Badge variant="success">PLAYER</Badge>
          </div>

          <form action={createPlayer} className="mt-6 space-y-6" aria-describedby="new-player-help">
            <p id="new-player-help" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
              Renseignez l’identité, un accès temporaire et un solde de départ si besoin. Le wallet est créé automatiquement.
            </p>

            <fieldset className="grid min-w-0 gap-4 md:grid-cols-2">
              <legend className="sr-only">Identité du joueur</legend>
              <div className="md:col-span-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input id="name" name="name" required autoComplete="name" placeholder="Ex: Yassine Benali" />
                <p className="mt-1 text-xs leading-5 text-slate-500">Utilisez le nom affiché dans l’équipe.</p>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" placeholder="joueur@exemple.ma" />
                <p className="mt-1 text-xs leading-5 text-slate-500">Adresse unique pour la connexion.</p>
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Facultatif" />
                <p className="mt-1 text-xs leading-5 text-slate-500">Utile pour les rappels WhatsApp.</p>
              </div>
            </fieldset>

            <fieldset className="grid min-w-0 gap-4 md:grid-cols-2">
              <legend className="sr-only">Accès et wallet</legend>
              <div>
                <Label htmlFor="temporaryPassword">Mot de passe temporaire</Label>
                <Input id="temporaryPassword" name="temporaryPassword" type="password" minLength={6} required autoComplete="new-password" placeholder="Minimum 6 caractères" />
                <p className="mt-1 text-xs leading-5 text-slate-500">Le joueur devra le changer à sa prochaine connexion.</p>
              </div>
              <div>
                <Label htmlFor="initialBalance">Solde initial</Label>
                <Input id="initialBalance" name="initialBalance" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" />
                <p className="mt-1 text-xs leading-5 text-slate-500">Optionnel. Montant en DH, positif ou nul.</p>
              </div>
            </fieldset>

            <div className="sticky bottom-0 -mx-5 border-t border-slate-200 bg-white/92 px-5 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
              <FormSubmitButton className="w-full sm:w-auto" pendingLabel="Ajout en cours...">
                Ajouter le joueur
              </FormSubmitButton>
              <p className="mt-3 text-center text-xs text-slate-500 sm:text-left" aria-live="polite">
                Confirmation : le joueur rejoint l’équipe.
              </p>
            </div>
          </form>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle>Liste des joueurs</CardTitle>
          <p className="text-sm text-slate-600">
            {sorted.length === 0 ? "Aucun joueur trouvé" : `${sorted.length} joueur(s) trouvé(s)`}
          </p>
        </div>

        <div className="mt-4 hidden overflow-x-auto overflow-y-visible rounded-2xl border lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Solde</th>
                <th className="px-4 py-3">Matchs</th>
                <th className="px-4 py-3">Créé le</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visiblePlayers.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                    Aucun joueur ne correspond à ces critères.
                  </td>
                </tr>
              ) : (
                visiblePlayers.map((player) => (
                  <tr key={player.id} className="border-t align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-slate-500">{player.id}</div>
                    </td>
                    <td className="px-4 py-3">{player.email}</td>
                    <td className="px-4 py-3">{player.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={player.isActive ? "success" : "danger"}>{player.isActive ? "Actif" : "Inactif"}</Badge>
                    </td>
                    <td className="px-4 py-3">{formatDh(Number(player.wallet?.balance ?? 0))}</td>
                    <td className="px-4 py-3">{player._count.participatedMatches}</td>
                    <td className="px-4 py-3">{format(player.createdAt, "dd/MM/yyyy", { locale: fr })}</td>
                    <td className="px-4 py-3">
                      <PlayerActionsMenu
                        playerId={player.id}
                        playerName={player.name}
                        isActive={player.isActive}
                        returnTo="/admin/joueurs"
                        disableAction={disablePlayer}
                        enableAction={enablePlayer}
                        resetPasswordAction={resetPlayerPassword}
                        deleteAction={deletePlayer}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-4 lg:hidden">
          {visiblePlayers.length === 0 ? (
            emptyLabel("Aucun joueur ne correspond à ces critères.")
          ) : (
            visiblePlayers.map((player) => (
              <div key={player.id} className="rounded-2xl border bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{player.name}</p>
                    <p className="text-sm text-slate-600">{player.email}</p>
                    <p className="text-sm text-slate-600">{player.phone ?? "Téléphone non renseigné"}</p>
                  </div>
                  <Badge variant={player.isActive ? "success" : "danger"}>{player.isActive ? "Actif" : "Inactif"}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Solde</p>
                    <p className="font-medium">{formatDh(Number(player.wallet?.balance ?? 0))}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Matchs</p>
                    <p className="font-medium">{player._count.participatedMatches}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Créé le</p>
                    <p className="font-medium">{format(player.createdAt, "dd/MM/yyyy", { locale: fr })}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <PlayerActionsMenu
                    playerId={player.id}
                    playerName={player.name}
                    isActive={player.isActive}
                    returnTo="/admin/joueurs"
                    disableAction={disablePlayer}
                    enableAction={enablePlayer}
                    resetPasswordAction={resetPlayerPassword}
                    deleteAction={deletePlayer}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-4 text-sm">
          <p className="text-slate-600">
            {sorted.length === 0 ? "Aucun joueur trouvé" : `${sorted.length} joueur(s) trouvé(s)`}
          </p>
          <div className="flex flex-wrap gap-2">
            {currentPage > 1 ? (
              <Button variant="ghost" asChild>
                <Link href={buildHref("/admin/joueurs", { ...sharedParams, page: String(currentPage - 1) })}>Précédent</Link>
              </Button>
            ) : (
              <Button variant="ghost" disabled>
                Précédent
              </Button>
            )}
            {currentPage < totalPages ? (
              <Button variant="ghost" asChild>
                <Link href={buildHref("/admin/joueurs", { ...sharedParams, page: String(currentPage + 1) })}>Suivant</Link>
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
