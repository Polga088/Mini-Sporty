import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PollResponseChoice, PollStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { getAppSettings } from "@/lib/settings";
import { WalletCard } from "@/components/wallet-card";
import { StatCard } from "@/components/stat-card";
import { QuickAction } from "@/components/quick-action";
import { ActivityFeed } from "@/components/activity-feed";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NoticeBanner } from "@/components/notice-banner";
import { respondToPoll } from "@/app/actions/polls";
import { redirect } from "next/navigation";
import { Bell, ClipboardList, Wallet, Volleyball, History, AlertTriangle } from "lucide-react";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type FeedTone = "default" | "success" | "warning" | "danger" | "info";

export default async function EspacePage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);
  const settings = await getAppSettings();

  const [wallet, matches, notifications, transactions, openPolls] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: session.user.id } }),
    prisma.match.findMany({
      orderBy: { matchDate: "asc" },
      take: 5,
      include: { participants: { where: { userId: session.user.id } } }
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.walletTransaction.findMany({
      where: { wallet: { userId: session.user.id } },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.poll.findMany({
      where: { status: PollStatus.OPEN },
      orderBy: { createdAt: "desc" },
      take: 1,
      include: {
        responses: { where: { userId: session.user.id } }
      }
    })
  ]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const lowBalance = Number(wallet?.balance ?? 0) < Number(settings.walletAlertThreshold);
  const nextMatch = matches[0];
  const openPoll = openPolls[0];
  const myResponse = openPoll?.responses[0];

  const activityItems: Array<{ title: string; description: string; meta: string; tone: FeedTone }> = [
    ...transactions.map((transaction) => ({
      title: transaction.type,
      description: `${formatDh(transaction.amount)} · ${transaction.description}`,
      meta: format(transaction.createdAt, "dd/MM", { locale: fr }),
      tone: (Number(transaction.amount) >= 0 ? "success" : "danger") as FeedTone
    })),
    ...notifications.map((notification) => ({
      title: notification.title,
      description: notification.message,
      meta: notification.isRead ? "Lue" : "Non lue",
      tone: (notification.isRead ? "default" : "warning") as FeedTone
    }))
  ];

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WalletCard
          balance={wallet?.balance ?? 0}
          threshold={settings.walletAlertThreshold}
          nextMatch={nextMatch ? `Prochain match: ${nextMatch.title}` : "Aucun match à venir."}
          alertCount={unreadCount}
        />
        <StatCard label="Prochains matchs" value={matches.length} hint="Matchs visibles dans l’agenda personnel" icon={<Volleyball className="h-5 w-5" />} tone="success" />
        <StatCard label="Alertes" value={unreadCount} hint="Notifications non lues" icon={<Bell className="h-5 w-5" />} tone={lowBalance ? "warning" : "info"} />
        <StatCard label="Dernières opérations" value={transactions.length} hint="Transactions récentes" icon={<History className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Dashboard Joueur</CardTitle>
                <CardDescription className="max-w-2xl">
                  Votre portefeuille, vos prochains matchs et vos réponses rapides aux sondages.
                </CardDescription>
              </div>
              <Button asChild variant="ghost">
                <Link href="/espace/sondages">Ouvrir les sondages</Link>
              </Button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card className="border-slate-200 bg-white/80">
                <CardDescription>Prochain match</CardDescription>
                {nextMatch ? (
                  <>
                    <CardTitle className="mt-2 text-2xl">{nextMatch.title}</CardTitle>
                    <p className="mt-2 text-sm text-slate-600">
                      {format(nextMatch.matchDate, "EEEE d MMMM yyyy", { locale: fr })} · {nextMatch.startTime} - {nextMatch.endTime}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{nextMatch.location}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="success">{nextMatch.status}</Badge>
                      <Badge variant="info">{formatDh(nextMatch.participationFee)}</Badge>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">Aucun match confirmé pour le moment.</p>
                )}
              </Card>

              <Card className="border-slate-200 bg-white/80">
                <CardDescription>Réponse rapide</CardDescription>
                {openPoll ? (
                  <form action={respondToPoll} className="mt-3 space-y-3">
                    <input type="hidden" name="pollId" value={openPoll.id} />
                    <CardTitle className="text-2xl">{openPoll.title}</CardTitle>
                    <p className="text-sm text-slate-600">{openPoll.matchTitle}</p>
                    <div className="grid gap-2">
                      {[
                        { value: PollResponseChoice.PRESENT, label: "Présent" },
                        { value: PollResponseChoice.MAYBE, label: "Peut-être" },
                        { value: PollResponseChoice.ABSENT, label: "Absent" }
                      ].map((option) => (
                        <label key={option.value} className="rounded-2xl border px-3 py-2 text-sm">
                          <input
                            type="radio"
                            name="response"
                            value={option.value}
                            defaultChecked={myResponse?.response === option.value}
                            className="mr-2"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                    <Button type="submit" className="w-full">
                      Enregistrer ma réponse
                    </Button>
                  </form>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">Aucun sondage ouvert pour l’instant.</p>
                )}
              </Card>
            </div>
          </Card>

          <ActivityFeed
            title="Historique personnel"
            description="Dernières opérations du portefeuille et notifications utiles."
            items={activityItems}
            emptyLabel="Aucune activité récente."
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitle>Raccourcis</CardTitle>
            <div className="mt-4 grid gap-3">
              <QuickAction href="/espace/portefeuilles" label="Mon portefeuille" description="Consulter ou alimenter mon solde" icon={<Wallet className="h-4 w-4" />} />
              <QuickAction href="/espace/sondages" label="Mes sondages" description="Répondre et suivre ma participation" icon={<ClipboardList className="h-4 w-4" />} tone="soft" />
              <QuickAction href="/espace/matchs" label="Mes matchs" description="Voir mes prochains rendez-vous" icon={<Volleyball className="h-4 w-4" />} />
            </div>
          </Card>

          <Card>
            <CardTitle>Alertes de solde</CardTitle>
            <CardDescription className="max-w-2xl">
              Un rappel est affiché quand votre portefeuille passe sous le seuil de {formatDh(settings.walletAlertThreshold)}.
            </CardDescription>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
                <div>
                  <p className="font-medium text-amber-950">{lowBalance ? "Solde faible" : "Solde correct"}</p>
                  <p className="text-sm text-amber-900">
                    {lowBalance
                      ? "Rechargez votre portefeuille avant le prochain match pour éviter une inscription bloquée."
                      : "Vous êtes au-dessus du seuil de sécurité."}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
