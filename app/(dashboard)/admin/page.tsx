import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BadgeEuro, Bell, ClipboardList, Settings, Users, Volleyball } from "lucide-react";
import { MatchParticipantStatus, MatchStatus, PollResponseChoice, PollStatus, Role, TopUpStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { getAppSettings } from "@/lib/settings";
import { canManageSport } from "@/lib/permissions";
import { ActivityFeed } from "@/components/activity-feed";
import { AdminMatchHero, type AdminMatchHeroData } from "@/components/admin-match-hero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PriorityPanel, type PriorityItem } from "@/components/priority-panel";
import { ProgressCard } from "@/components/progress-card";
import { QuickAction } from "@/components/quick-action";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";

type FeedTone = "default" | "success" | "warning" | "danger" | "info";

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "";
}

function topUpStatusLabel(status: TopUpStatus) {
  if (status === TopUpStatus.APPROVED) return "validée";
  if (status === TopUpStatus.REJECTED) return "rejetée";
  if (status === TopUpStatus.CANCELLED) return "annulée";
  return "en attente";
}

function topUpTone(status: TopUpStatus): FeedTone {
  if (status === TopUpStatus.APPROVED) return "success";
  if (status === TopUpStatus.REJECTED || status === TopUpStatus.CANCELLED) return "danger";
  return "warning";
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

function matchTone(status: MatchStatus): FeedTone {
  if (status === MatchStatus.CANCELLED) return "danger";
  if (status === MatchStatus.OPEN || status === MatchStatus.CONFIRMED) return "success";
  if (status === MatchStatus.FULL) return "warning";
  return "info";
}

function matchStatusTone(status: MatchStatus): AdminMatchHeroData["statusTone"] {
  if (status === MatchStatus.CANCELLED) return "error";
  if (status === MatchStatus.OPEN || status === MatchStatus.CONFIRMED) return "success";
  if (status === MatchStatus.FULL) return "warning";
  return "info";
}

function pollStatusLabel(status: PollStatus) {
  switch (status) {
    case PollStatus.DRAFT:
      return "brouillon";
    case PollStatus.OPEN:
      return "ouvert";
    case PollStatus.PAUSED:
      return "suspendu";
    case PollStatus.CLOSED:
      return "clôturé";
    case PollStatus.CANCELLED:
      return "annulé";
  }
}

function pollTone(status: PollStatus): FeedTone {
  if (status === PollStatus.OPEN) return "success";
  if (status === PollStatus.PAUSED) return "warning";
  if (status === PollStatus.CANCELLED) return "danger";
  return "default";
}

function formatDateTime(date: Date) {
  return format(date, "d MMM yyyy · HH:mm", { locale: fr });
}

function formatMatchDate(date: Date) {
  return format(date, "EEEE d MMMM yyyy", { locale: fr });
}

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canManageSport(session.user.role)) redirect("/espace");

  const settings = await getAppSettings();
  const now = new Date();

  const [players, wallets, matches, contributions, topUps, pollResponses, nextMatch, recentTopUps, recentMatches, recentPolls] =
    await Promise.all([
      prisma.user.count({ where: { role: Role.PLAYER, isActive: true } }),
      prisma.wallet.findMany({ include: { user: { select: { role: true, isActive: true, name: true } } } }),
      prisma.match.count(),
      prisma.contribution.count(),
      prisma.walletTopUp.count({ where: { status: TopUpStatus.PENDING } }),
      prisma.pollResponse.findMany({
        select: { response: true, isWaitlisted: true }
      }),
      prisma.match.findFirst({
        where: {
          status: { not: MatchStatus.CANCELLED },
          matchDate: { gte: now }
        },
        orderBy: { matchDate: "asc" },
        include: {
          participants: {
            select: { status: true }
          }
        }
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
  const globalFillRate = Math.round((presentCount / responseBase) * 100);

  const heroMatch: AdminMatchHeroData | null = nextMatch
    ? {
        id: nextMatch.id,
        title: nextMatch.title,
        dateLabel: formatMatchDate(nextMatch.matchDate),
        timeLabel: `${nextMatch.startTime} - ${nextMatch.endTime}`,
        location: nextMatch.location,
        capacity: nextMatch.capacity,
        confirmedCount: nextMatch.participants.filter((participant) => participant.status === MatchParticipantStatus.CONFIRMED).length,
        waitlistCount: nextMatch.participants.filter((participant) => participant.status === MatchParticipantStatus.WAITLISTED).length,
        participationFee: nextMatch.participationFee,
        statusLabel: matchStatusLabel(nextMatch.status),
        statusTone: matchStatusTone(nextMatch.status)
      }
    : null;

  const priorityItems: PriorityItem[] = [
    ...(topUps > 0
      ? [
          {
            href: "/admin/alimentations?status=PENDING",
            label: `${topUps} alimentation${topUps > 1 ? "s" : ""} à valider`,
            description: "Demandes joueur en attente de validation administrative.",
            count: topUps,
            badgeLabel: "À valider",
            tone: "warning" as const,
            icon: <BadgeEuro className="h-4 w-4" />
          }
        ]
      : []),
    ...(alertsCount > 0
      ? [
          {
            href: "/admin/joueurs?status=active",
            label: `${alertsCount} joueur${alertsCount > 1 ? "s" : ""} avec un solde faible`,
            description: `Portefeuilles actifs sous le seuil de ${formatDh(settings.walletAlertThreshold)}.`,
            count: alertsCount,
            badgeLabel: "Solde faible",
            tone: "error" as const,
            icon: <Bell className="h-4 w-4" />
          }
        ]
      : [])
  ];

  const activityItems = [
    ...recentTopUps.map((topUp) => ({
      date: topUp.createdAt,
      title: `Alimentation · ${topUp.user.name}`,
      description: `${formatDh(topUp.amount)} · ${topUpStatusLabel(topUp.status)} · ${formatDateTime(topUp.createdAt)}`,
      meta: topUpStatusLabel(topUp.status),
      tone: topUpTone(topUp.status)
    })),
    ...recentMatches.map((match) => ({
      date: match.matchDate,
      title: `Match · ${match.title}`,
      description: `${match.location} · ${formatDh(match.participationFee)} · ${formatDateTime(match.matchDate)}`,
      meta: matchStatusLabel(match.status),
      tone: matchTone(match.status)
    })),
    ...recentPolls.map((poll) => ({
      date: poll.createdAt,
      title: `Sondage · ${poll.title}`,
      description: `${poll.capacity} places · ${pollStatusLabel(poll.status)} · ${formatDateTime(poll.createdAt)}`,
      meta: pollStatusLabel(poll.status),
      tone: pollTone(poll.status)
    }))
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  const adminName = firstName(session.user.name);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard admin"
        title={adminName ? `Bonjour ${adminName}` : "Bonjour"}
        description="Le prochain match et les priorités de l’équipe en un coup d’œil."
        primaryAction={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/admin/sondages/nouveau">Nouveau sondage</Link>
          </Button>
        }
      />

      <section aria-labelledby="next-match-title">
        <h2 id="next-match-title" className="sr-only">
          Prochain rendez-vous
        </h2>
        <AdminMatchHero match={heroMatch} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <PriorityPanel items={priorityItems} />

        <Card>
          <SectionHeader title="Collectif" description="Vue globale de l’activité sportive, sans rattacher les réponses au prochain match." />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StatCard label="Joueurs actifs" value={players} hint="Comptes joueurs connectables" icon={<Users className="h-5 w-5" />} tone="success" />
            <StatCard label="Matchs enregistrés" value={matches} hint="Total des matchs créés" icon={<Volleyball className="h-5 w-5" />} tone="info" />
            <StatCard label="Cotisations" value={contributions} hint="Campagnes actives ou passées" icon={<ClipboardList className="h-5 w-5" />} />
            <ProgressCard
              label="Réponses de sondage globales"
              value={`${globalFillRate}%`}
              percent={globalFillRate}
              help={`Total global: ${presentCount} présents · ${waitlistCount} attente · ${absentCount} absents`}
            />
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <div className="space-y-6">
          <Card>
            <SectionHeader title="Finance" description="Indicateurs agrégés des portefeuilles Mini Sporty." />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <StatCard label="Portefeuille global" value={<span className="text-2xl tabular-nums sm:text-3xl">{formatDh(totalBalance)}</span>} hint="Somme agrégée des wallets" icon={<BadgeEuro className="h-5 w-5" />} />
              <StatCard label="Alimentations en attente" value={topUps} hint="À valider par l’admin" tone="warning" />
              <StatCard label="Soldes faibles" value={alertsCount} hint={`Sous ${formatDh(settings.walletAlertThreshold)}`} tone={alertsCount > 0 ? "danger" : "success"} />
            </div>
          </Card>

          <ActivityFeed
            title="Activité récente"
            description="Flux unifié trié par date: alimentations, matchs et sondages."
            items={activityItems}
            emptyLabel="Aucune activité récente à afficher."
          />
        </div>

        <Card>
          <SectionHeader title="Raccourcis" description="Accès secondaires pour piloter l’organisation." />
          <div className="mt-4 grid gap-3">
            <QuickAction href="/admin/sondages" label="Sondages" description="Ouvrir, suspendre ou clôturer" icon={<ClipboardList className="h-4 w-4" />} />
            <QuickAction href="/admin/matchs" label="Matchs" description="Créer et gérer les rendez-vous" icon={<Volleyball className="h-4 w-4" />} tone="soft" />
            <QuickAction href="/admin/joueurs" label="Joueurs" description="Comptes, statuts et mots de passe" icon={<Users className="h-4 w-4" />} />
            <QuickAction href="/admin/parametres" label="Paramètres" description="Logo, seuils et WhatsApp" icon={<Settings className="h-4 w-4" />} tone="soft" />
          </div>
        </Card>
      </section>
    </div>
  );
}
