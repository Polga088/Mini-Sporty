import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoticeBanner } from "@/components/notice-banner";
import { PollActionsMenu } from "@/components/poll-actions-menu";
import { pollStatusLabels, pollStatusVariant } from "@/lib/polls";
import { canManageSport } from "@/lib/permissions";
import { cancelPoll, closePoll, createMatchFromPoll, openPoll, pausePoll, reopenPoll, syncPollAutomation } from "@/app/actions/polls";
import { redirect } from "next/navigation";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeQuery(searchParams?: QueryParams | Promise<QueryParams>) {
  return Promise.resolve(searchParams ?? {}).then((params) => ({
    q: firstValue(params.q)?.trim() ?? "",
    status: firstValue(params.status) ?? "all",
    page: Math.max(1, Number(firstValue(params.page) ?? "1") || 1),
    success: firstValue(params.success),
    error: firstValue(params.error)
  }));
}

function matchesSearch(poll: { title: string; matchTitle: string; location: string; description: string | null }, term: string) {
  if (!term) return true;
  const needle = term.toLowerCase();
  return [poll.title, poll.matchTitle, poll.location, poll.description ?? ""].some((value) => value.toLowerCase().includes(needle));
}

function emptyLabel(label: string) {
  return <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-slate-500">{label}</div>;
}

export default async function AdminPollsPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canManageSport(session.user.role)) redirect("/espace");

  const { q, status, page, success, error } = await normalizeQuery(searchParams);

  const polls = await prisma.poll.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      match: true,
      responses: true
    }
  });

  const filtered = polls.filter((poll) => {
    const statusMatch = status === "all" ? true : poll.status === status;
    return statusMatch && matchesSearch(poll, q);
  });

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visiblePolls = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const sharedParams = { q, status };

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardDescription>Total sondages</CardDescription>
          <CardTitle className="mt-2 text-3xl">{polls.length}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Ouverts</CardDescription>
          <CardTitle className="mt-2 text-3xl">{polls.filter((poll) => poll.status === "OPEN").length}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Suspendus</CardDescription>
          <CardTitle className="mt-2 text-3xl">{polls.filter((poll) => poll.status === "PAUSED").length}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Capacité totale</CardDescription>
          <CardTitle className="mt-2 text-3xl">{polls.reduce((sum, poll) => sum + poll.capacity, 0)}</CardTitle>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Sondages</CardTitle>
            <CardDescription className="max-w-2xl">
              Centralisez les réponses, gérez la capacité, puis créez un match quand le groupe est prêt.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin/sondages/nouveau">Nouveau sondage</Link>
          </Button>
          <form action={syncPollAutomation}>
            <Button type="submit" variant="ghost">
              Synchroniser maintenant
            </Button>
          </form>
        </div>

        <form method="get" className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label htmlFor="q">Recherche</Label>
            <Input id="q" name="q" defaultValue={q} placeholder="Titre, match, terrain, description" />
          </div>
          <div>
            <Label htmlFor="status">Statut</Label>
            <select id="status" name="status" defaultValue={status} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              <option value="all">Tous</option>
              <option value="DRAFT">Brouillon</option>
              <option value="OPEN">Ouvert</option>
              <option value="PAUSED">Suspendu</option>
              <option value="CLOSED">Clôturé</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </div>
          <div className="md:col-span-3 flex flex-wrap gap-3">
            <Button type="submit">Appliquer</Button>
            <Button asChild variant="ghost">
              <Link href="/admin/sondages">Réinitialiser</Link>
            </Button>
          </div>
        </form>
      </Card>

      <section className="grid gap-4">
        {visiblePolls.length === 0 ? (
          <Card>{emptyLabel("Aucun sondage ne correspond à ces critères.")}</Card>
        ) : (
          visiblePolls.map((poll) => {
            const presentCount = poll.responses.filter((response) => response.response === "PRESENT" && !response.isWaitlisted).length;
            const waitlistCount = poll.responses.filter((response) => response.isWaitlisted).length;
            const fillRate = poll.capacity > 0 ? Math.round((presentCount / poll.capacity) * 100) : 0;

            return (
              <Card key={poll.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{poll.title}</CardTitle>
                      <Badge variant={pollStatusVariant(poll.status)}>{pollStatusLabels[poll.status]}</Badge>
                    </div>
                    <CardDescription className="max-w-2xl">
                      {poll.matchTitle} · {poll.location}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">{formatDh(poll.matchAmount)}</p>
                    <p className="text-sm text-slate-600">
                      {presentCount}/{poll.capacity} présents
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Ouverture</p>
                    <p className="mt-1 text-sm font-medium">
                      {poll.opensAt ? format(poll.opensAt, "dd/MM/yyyy HH:mm", { locale: fr }) : "Non définie"}
                    </p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Clôture</p>
                    <p className="mt-1 text-sm font-medium">
                      {poll.closesAt ? format(poll.closesAt, "dd/MM/yyyy HH:mm", { locale: fr }) : "Non définie"}
                    </p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Liste d’attente</p>
                    <p className="mt-1 text-sm font-medium">{waitlistCount}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Remplissage</p>
                    <p className="mt-1 text-sm font-medium">{fillRate}%</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-600">
                    Créé le {format(poll.createdAt, "dd/MM/yyyy", { locale: fr })} · {poll.matchDate ? format(poll.matchDate, "dd/MM/yyyy", { locale: fr }) : ""}
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
              </Card>
            );
          })
        )}
      </section>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Page {currentPage} sur {totalPages}
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <Button key={pageNumber} asChild variant={pageNumber === currentPage ? "secondary" : "ghost"}>
                  <Link href={new URLSearchParams({ ...sharedParams, page: String(pageNumber) }).toString() ? `/admin/sondages?${new URLSearchParams({ ...sharedParams, page: String(pageNumber) }).toString()}` : "/admin/sondages"}>
                    {pageNumber}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
