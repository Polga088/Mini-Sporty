import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { getAppSettings } from "@/lib/settings";
import { StatCard } from "@/components/stat-card";
import { QuickAction } from "@/components/quick-action";
import { ProgressCard } from "@/components/progress-card";
import { ActivityFeed } from "@/components/activity-feed";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { BadgeEuro, ClipboardList, Users, Bell, Volleyball, Settings } from "lucide-react";
import { Role, TopUpStatus, MatchStatus, PollStatus, PollResponseChoice } from "@prisma/client";
import { canManageSport } from "@/lib/permissions";

type FeedTone = "default" | "success" | "warning" | "danger" | "info";

function topUpTone(status: TopUpStatus): FeedTone {
  if (status === TopUpStatus.APPROVED) return "success";
  if (status === TopUpStatus.REJECTED) return "danger";
  return "warning";
}

function matchTone(status: MatchStatus): FeedTone {
  if (status === MatchStatus.CANCELLED) return "danger";
  if (status === MatchStatus.OPEN) return "success";
  return "info";
}

function pollTone(status: PollStatus): FeedTone {
  if (status === PollStatus.OPEN) return "success";
  if (status === PollStatus.PAUSED) return "warning";
  return "default";
}

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canManageSport(session.user.role)) redirect("/espace");

  const settings = await getAppSettings();

  const [players, wallets, matches, contributions, topUps, pollResponses, recentTopUps, recentMatches, recentPolls] =
    await Promise.all([
      prisma.user.count({ where: { role: Role.PLAYER, isActive: true } }),
      prisma.wallet.findMany({ include: { user: { select: { role: true, isActive: true, name: true } } } }),
      prisma.match.count(),
      prisma.contribution.count(),
      prisma.walletTopUp.count({ where: { status: TopUpStatus.PENDING } }),
      prisma.pollResponse.findMany({
        select: { response: true, isWaitlisted: true }
      }),
      prisma.walletTopUp.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { user: { select: { name: true } } }
      }),
      prisma.match.findMany({
        orderBy: { matchDate: "desc" },
        take: 3
      }),
      prisma.poll.findMany({
        orderBy: { createdAt: "desc" },
        take: 3
      })
    ]);

  const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0);
  const alertsCount = wallets.filter((wallet) => wallet.user.role === Role.PLAYER && wallet.user.isActive && Number(wallet.balance) < settings.walletAlertThreshold.toNumber()).length;
  const responseBase = pollResponses.length || 1;
  const presentCount = pollResponses.filter((response) => response.response === PollResponseChoice.PRESENT && !response.isWaitlisted).length;
  const absentCount = pollResponses.filter((response) => response.response === PollResponseChoice.ABSENT).length;
  const waitlistCount = pollResponses.filter((response) => response.isWaitlisted).length;
  const fillRate = Math.round((presentCount / responseBase) * 100);

  const activityItems = [
    ...recentTopUps.map((topUp) => ({
      title: `${topUp.user.name} · ${formatDh(topUp.amount)}`,
      description: `Alimentation ${topUp.status === TopUpStatus.APPROVED ? "validée" : topUp.status === TopUpStatus.PENDING ? "en attente" : "traitée"}.`,
      meta: topUp.status,
      tone: topUpTone(topUp.status)
    })),
    ...recentMatches.map((match) => ({
      title: match.title,
      description: `${match.location} · ${formatDh(match.participationFee)} · ${match.status === MatchStatus.OPEN ? "ouvert" : "statut " + match.status.toLowerCase()}`,
      meta: formatDh(match.participationFee),
      tone: matchTone(match.status)
    })),
    ...recentPolls.map((poll) => ({
      title: poll.title,
      description: `${poll.capacity} places · ${poll.status === PollStatus.OPEN ? "Ouvert" : poll.status === PollStatus.PAUSED ? "Suspendu" : poll.status.toLowerCase()}`,
      meta: poll.status,
      tone: pollTone(poll.status)
    }))
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Joueurs actifs" value={players} hint="Comptes joueurs connectables" icon={<Users className="h-5 w-5" />} tone="success" />
        <StatCard label="Présents" value={presentCount} hint="Réponses positives sans attente" icon={<Volleyball className="h-5 w-5" />} tone="success" />
        <StatCard label="Absents" value={absentCount} hint="Réponses déclarées absentes" icon={<ClipboardList className="h-5 w-5" />} tone="warning" />
        <StatCard label="Liste d’attente" value={waitlistCount} hint="Joueurs en attente de place" icon={<Bell className="h-5 w-5" />} tone="info" />
        <StatCard label="Portefeuille global" value={formatDh(totalBalance)} hint={`Seuil d’alerte ${formatDh(settings.walletAlertThreshold)}`} icon={<BadgeEuro className="h-5 w-5" />} tone="default" />
        <StatCard label="Alertes" value={alertsCount} hint="Soldes sous le seuil défini" icon={<Settings className="h-5 w-5" />} tone="danger" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Dashboard Admin</CardTitle>
                <CardDescription className="max-w-2xl">
                  Vue de pilotage pour les joueurs, les sondages, les matchs et le portefeuille global.
                </CardDescription>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ProgressCard
                label="Répartition des réponses"
                value={`${fillRate}%`}
                percent={fillRate}
                help={`Présents: ${presentCount} · Liste d’attente: ${waitlistCount} · Absents: ${absentCount}`}
              />
              <Card className="border-slate-200 bg-white/80">
                <CardDescription>Organisation</CardDescription>
                <CardTitle className="mt-2 text-2xl">{settings.organizationName}</CardTitle>
                <p className="mt-2 text-sm text-slate-600">{settings.defaultGround} · Capacité défaut {settings.defaultCapacity}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">Match par défaut {formatDh(settings.defaultMatchPrice)}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">Alerte portefeuille {formatDh(settings.walletAlertThreshold)}</span>
                </div>
              </Card>
            </div>
          </Card>

          <ActivityFeed
            title="Activité récente"
            description="Les dernières actions financières, sportives et de sondage."
            items={activityItems}
            emptyLabel="Aucune activité récente à afficher."
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitle>Actions rapides</CardTitle>
            <div className="mt-4 grid gap-3">
              <QuickAction href="/admin/sondages/nouveau" label="Nouveau sondage" description="Préparer le prochain vendredi" icon={<ClipboardList className="h-4 w-4" />} />
              <QuickAction href="/admin/matchs/nouveau" label="Nouveau match" description="Créer un match avec les paramètres par défaut" icon={<Volleyball className="h-4 w-4" />} tone="soft" />
              <QuickAction href="/admin/joueurs" label="Gérer les joueurs" description="Créer, réactiver, réinitialiser ou supprimer" icon={<Users className="h-4 w-4" />} />
              <QuickAction href="/admin/parametres" label="Paramètres" description="Logo, seuils et modèle WhatsApp" icon={<Settings className="h-4 w-4" />} tone="soft" />
            </div>
          </Card>

          <Card>
            <CardTitle>Vue portefeuille</CardTitle>
            <CardDescription className="max-w-2xl">
              Solde global, demandes en attente et alertes de seuil faible.
            </CardDescription>
            <div className="mt-4 grid gap-3">
              <StatCard label="Demandes en attente" value={topUps} hint="Top-ups en revue" tone="warning" />
              <StatCard label="Matchs" value={matches} hint="Total de matchs enregistrés" tone="info" />
              <StatCard label="Cotisations" value={contributions} hint="Campagnes actives ou passées" tone="default" />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
