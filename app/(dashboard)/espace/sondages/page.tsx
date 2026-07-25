import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { NoticeBanner } from "@/components/notice-banner";
import { ConfirmButton } from "@/components/confirm-button";
import { pollResponseLabels, pollStatusLabels, pollStatusVariant } from "@/lib/polls";
import { respondToPoll } from "@/app/actions/polls";
import { redirect } from "next/navigation";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function emptyLabel(label: string) {
  return <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-slate-500">{label}</div>;
}

export default async function PlayerPollsPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      pollResponses: {
        include: {
          poll: true
        }
      }
    }
  });

  if (!user) redirect("/connexion");

  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id }
  });

  const polls = await prisma.poll.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      responses: {
        where: { userId: user.id }
      }
    }
  });

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardDescription>Sondages</CardDescription>
          <CardTitle className="mt-2 text-3xl">{polls.length}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Réponses</CardDescription>
          <CardTitle className="mt-2 text-3xl">{user.pollResponses.length}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Solde wallet</CardDescription>
          <CardTitle className="mt-2 text-3xl">{formatDh(wallet?.balance ?? 0)}</CardTitle>
        </Card>
      </section>

      <Card>
        <CardTitle>Sondages disponibles</CardTitle>
        <CardDescription className="max-w-2xl">
          Répondez aux sondages ouverts. La modification de réponse dépend des réglages administrateur.
        </CardDescription>
        <div className="mt-4 space-y-4">
          {polls.length === 0 ? (
            emptyLabel("Aucun sondage disponible.")
          ) : (
            polls.map((poll) => {
              const myResponse = poll.responses[0];
              const presentCount = poll.responses.filter((response) => response.response === "PRESENT" && !response.isWaitlisted).length;
              const waitlistCount = poll.responses.filter((response) => response.isWaitlisted).length;
              const remainingSlots = Math.max(0, poll.capacity - presentCount);

              return (
                <div key={poll.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{poll.title}</p>
                      <p className="text-sm text-slate-600">
                        {poll.matchTitle} · {poll.location} · {formatDh(poll.matchAmount)}
                      </p>
                    </div>
                    <Badge variant={pollStatusVariant(poll.status)}>{pollStatusLabels[poll.status]}</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                    <p>{presentCount}/{poll.capacity} présents</p>
                    <p>{remainingSlots} place(s) restante(s)</p>
                    <p>{waitlistCount} en attente</p>
                    <p>{poll.closesAt ? `Clôture le ${format(poll.closesAt, "dd/MM/yyyy HH:mm", { locale: fr })}` : "Sans clôture programmée"}</p>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-medium">Votre réponse</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {myResponse ? pollResponseLabels[myResponse.response] : "Aucune réponse"}
                        {myResponse?.isWaitlisted ? " · Liste d’attente" : ""}
                      </p>
                    </div>

                    {poll.status === "OPEN" ? (
                      <form action={respondToPoll} className="space-y-3 rounded-2xl border p-4">
                        <input type="hidden" name="pollId" value={poll.id} />
                        <p className="text-sm font-medium">Répondre</p>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <label className="rounded-xl border px-3 py-2 text-sm">
                            <input type="radio" name="response" value="PRESENT" defaultChecked={myResponse?.response === "PRESENT"} className="mr-2" />
                            Présent
                          </label>
                          <label className="rounded-xl border px-3 py-2 text-sm">
                            <input type="radio" name="response" value="ABSENT" defaultChecked={myResponse?.response === "ABSENT"} className="mr-2" />
                            Absent
                          </label>
                          <label className="rounded-xl border px-3 py-2 text-sm">
                            <input type="radio" name="response" value="MAYBE" defaultChecked={myResponse?.response === "MAYBE"} className="mr-2" />
                            Peut-être
                          </label>
                        </div>
                        <ConfirmButton type="submit" className="w-full" message="Confirmer l’enregistrement de cette réponse ?">
                          Enregistrer ma réponse
                        </ConfirmButton>
                      </form>
                    ) : (
                      <div className="rounded-2xl border p-4 text-sm text-slate-600">
                        Réponses fermées pour ce sondage.
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="ghost">
          <a href="/espace">Retour à l’espace</a>
        </Button>
      </div>
    </div>
  );
}
