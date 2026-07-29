import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BadgeEuro,
  Bell,
  CalendarCheck,
  ClipboardList,
  CircleAlert,
  Plus,
  Settings,
  ShieldCheck,
  TrendingDown,
  Users,
  Volleyball,
  WalletCards
} from "lucide-react";
import {
  ContributionStatus,
  ExpenseCategory,
  MatchParticipantStatus,
  MatchStatus,
  PollResponseChoice,
  PollStatus,
  Role,
  TopUpStatus
} from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { getAppSettings } from "@/lib/settings";
import { canManageSport } from "@/lib/permissions";
import { AdminMatchHero, type AdminMatchHeroData } from "@/components/admin-match-hero";
import { Button } from "@/components/ui/button";
import { PriorityPanel, type PriorityItem } from "@/components/priority-panel";
import { ActivityTimeline, type ActivityTimelineItem, FinanceCard, MetricCard, PremiumPageHeader, QuickActionCard, SportMetricCard } from "@/components/premium-dashboard";

type FeedTone = "emerald" | "amber" | "rose" | "sky" | "slate";

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
  if (status === TopUpStatus.APPROVED) return "emerald";
  if (status === TopUpStatus.REJECTED || status === TopUpStatus.CANCELLED) return "rose";
  return "amber";
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
  if (status === MatchStatus.CANCELLED) return "rose";
  if (status === MatchStatus.OPEN || status === MatchStatus.CONFIRMED) return "emerald";
  if (status === MatchStatus.FULL) return "amber";
  return "sky";
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
  if (status === PollStatus.OPEN) return "emerald";
  if (status === PollStatus.PAUSED) return "amber";
  if (status === PollStatus.CANCELLED) return "rose";
  return "slate";
}

function contributionStatusLabel(status: ContributionStatus) {
  if (status === ContributionStatus.ACTIVE) return "active";
  if (status === ContributionStatus.COMPLETED) return "terminée";
  if (status === ContributionStatus.CANCELLED) return "annulée";
  return "brouillon";
}

function contributionTone(status: ContributionStatus): FeedTone {
  if (status === ContributionStatus.ACTIVE) return "emerald";
  if (status === ContributionStatus.CANCELLED) return "rose";
  if (status === ContributionStatus.COMPLETED) return "slate";
  return "sky";
}

function expenseCategoryLabel(category: ExpenseCategory) {
  return category.toLowerCase().replaceAll("_", " ");
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

  const [
    players,
    wallets,
    matches,
    contributions,
    pendingTopUps,
    openPolls,
    draftMatches,
    pollResponses,
    nextMatch,
    recentTopUps,
    recentMatches,
    recentPolls,
    recentContributions,
    recentExpenses
  ] = await Promise.all([
    prisma.user.count({ where: { role: Role.PLAYER, isActive: true } }),
    prisma.wallet.findMany({ include: { user: { select: { role: true, isActive: true, name: true } } } }),
    prisma.match.count(),
    prisma.contribution.count(),
    prisma.walletTopUp.count({ where: { status: TopUpStatus.PENDING } }),
    prisma.poll.count({ where: { status: PollStatus.OPEN } }),
    prisma.match.count({ where: { status: MatchStatus.DRAFT, matchDate: { gte: now } } }),
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
    }),
    prisma.contribution.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, amountPerPlayer: true, status: true, createdAt: true }
    }),
    prisma.expense.findMany({
      orderBy: { expenseDate: "desc" },
      take: 3,
      select: { id: true, title: true, amount: true, category: true, expenseDate: true }
    })
  ]);

  const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0);
  const walletAlertThreshold = settings.walletAlertThreshold.toNumber();
  const alertsCount = wallets.filter((wallet) => wallet.user.role === Role.PLAYER && wallet.user.isActive && Number(wallet.balance) < walletAlertThreshold).length;
  const responseBase = pollResponses.length || 1;
  const presentCount = pollResponses.filter((response) => response.response === PollResponseChoice.PRESENT && !response.isWaitlisted).length;
  const absentCount = pollResponses.filter((response) => response.response === PollResponseChoice.ABSENT).length;
  const maybeCount = pollResponses.filter((response) => response.response === PollResponseChoice.MAYBE).length;
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
    ...(pendingTopUps > 0
      ? [
          {
            href: "/admin/alimentations?status=PENDING",
            label: "Valider les paiements",
            description: `${pendingTopUps} demande${pendingTopUps > 1 ? "s" : ""} en attente côté portefeuille.`,
            count: pendingTopUps,
            badgeLabel: "Finance",
            tone: "warning" as const,
            icon: <BadgeEuro className="h-4 w-4" />
          }
        ]
      : []),
    ...(alertsCount > 0
      ? [
          {
            href: "/admin/joueurs?status=active",
            label: "Relancer les soldes",
            description: `${alertsCount} joueur${alertsCount > 1 ? "s" : ""} sous le seuil de ${formatDh(settings.walletAlertThreshold)}.`,
            count: alertsCount,
            badgeLabel: "Alerte",
            tone: "error" as const,
            icon: <Bell className="h-4 w-4" />
          }
        ]
      : []),
    ...(openPolls > 0
      ? [
          {
            href: "/admin/sondages?status=OPEN",
            label: "Suivre les sondages",
            description: `${openPolls} sondage${openPolls > 1 ? "s" : ""} ouvert${openPolls > 1 ? "s" : ""} à surveiller.`,
            count: openPolls,
            badgeLabel: "Sport",
            tone: "info" as const,
            icon: <ClipboardList className="h-4 w-4" />
          }
        ]
      : []),
    ...(draftMatches > 0
      ? [
          {
            href: "/admin/matchs?status=DRAFT",
            label: "Cadrer les matchs",
            description: `${draftMatches} match${draftMatches > 1 ? "s" : ""} brouillon${draftMatches > 1 ? "s" : ""} à finaliser.`,
            count: draftMatches,
            badgeLabel: "Prépa",
            tone: "neutral" as const,
            icon: <CircleAlert className="h-4 w-4" />
          }
        ]
      : [])
  ];

  const activityItems: ActivityTimelineItem[] = [
    ...recentTopUps.map((topUp) => ({
      id: `topup-${topUp.id}`,
      date: topUp.createdAt,
      href: "/admin/alimentations",
      type: "topup" as const,
      title: topUp.user.name,
      description: `${formatDh(topUp.amount)} · ${formatDateTime(topUp.createdAt)}`,
      meta: topUpStatusLabel(topUp.status),
      tone: topUpTone(topUp.status)
    })),
    ...recentMatches.map((match) => ({
      id: `match-${match.id}`,
      date: match.matchDate,
      href: `/admin/matchs/${match.id}`,
      type: "match" as const,
      title: match.title,
      description: `${match.location} · ${formatDh(match.participationFee)} · ${formatDateTime(match.matchDate)}`,
      meta: matchStatusLabel(match.status),
      tone: matchTone(match.status)
    })),
    ...recentPolls.map((poll) => ({
      id: `poll-${poll.id}`,
      date: poll.createdAt,
      href: `/admin/sondages/${poll.id}`,
      type: "poll" as const,
      title: poll.title,
      description: `${poll.capacity} places · ${formatDateTime(poll.createdAt)}`,
      meta: pollStatusLabel(poll.status),
      tone: pollTone(poll.status)
    })),
    ...recentContributions.map((contribution) => ({
      id: `contribution-${contribution.id}`,
      date: contribution.createdAt,
      href: "/admin/cotisations",
      type: "contribution" as const,
      title: contribution.title,
      description: `${formatDh(contribution.amountPerPlayer)} par joueur · ${formatDateTime(contribution.createdAt)}`,
      meta: contributionStatusLabel(contribution.status),
      tone: contributionTone(contribution.status)
    })),
    ...recentExpenses.map((expense) => ({
      id: `expense-${expense.id}`,
      date: expense.expenseDate,
      href: "/admin/depenses",
      type: "expense" as const,
      title: expense.title,
      description: `${formatDh(expense.amount)} · ${expenseCategoryLabel(expense.category)} · ${formatDateTime(expense.expenseDate)}`,
      meta: "dépense",
      tone: "rose" as const
    }))
  ];

  const sortedActivityItems = activityItems
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  const adminName = firstName(session.user.name);
  const approvedAmount = recentTopUps.filter((topUp) => topUp.status === TopUpStatus.APPROVED).reduce((sum, topUp) => sum + Number(topUp.amount), 0);
  const expenseAmount = recentExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  return (
    <div className="space-y-7">
      <PremiumPageHeader
        eyebrow="QG du vendredi"
        title={adminName ? `Bonjour ${adminName}` : "Bonjour"}
        description="Le prochain match, les priorités et l’état du collectif au même endroit."
        action={
          <Button asChild className="w-full bg-emerald-500 text-white hover:bg-emerald-600 sm:w-auto">
            <Link href="/admin/sondages/nouveau">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nouveau sondage
            </Link>
          </Button>
        }
      />

      <section aria-labelledby="next-match-title">
        <h2 id="next-match-title" className="sr-only">
          Prochain match
        </h2>
        <AdminMatchHero match={heroMatch} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <PriorityPanel items={priorityItems} />

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label="Joueurs actifs" value={players} hint="Comptes joueurs actuellement connectables." icon={<Users className="h-5 w-5" />} tone="emerald" />
          <MetricCard label="Matchs créés" value={matches} hint="Historique complet des rendez-vous." icon={<Volleyball className="h-5 w-5" />} tone="sky" />
          <MetricCard label="Cotisations" value={contributions} hint="Campagnes enregistrées dans Mini Sporty." icon={<ShieldCheck className="h-5 w-5" />} tone="slate" />
          <MetricCard label="Sondages ouverts" value={openPolls} hint="Votes encore actifs pour les joueurs." icon={<ClipboardList className="h-5 w-5" />} tone={openPolls > 0 ? "amber" : "emerald"} />
        </div>
      </section>

      <FinanceCard
        balance={<span className="whitespace-nowrap tabular-nums">{formatDh(totalBalance)}</span>}
        pendingTopUps={pendingTopUps}
        lowBalancePlayers={alertsCount}
        recentInflows={<span className="whitespace-nowrap tabular-nums">{formatDh(approvedAmount)}</span>}
        recentOutflows={<span className="whitespace-nowrap tabular-nums">{formatDh(expenseAmount)}</span>}
        alertThreshold={<span className="whitespace-nowrap">{formatDh(settings.walletAlertThreshold)}</span>}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            <SportMetricCard title="Présents" value={presentCount} description={`${globalFillRate}% des réponses globales sont confirmées présentes.`} progress={globalFillRate} tone="emerald" icon={<CalendarCheck className="h-4 w-4" />} />
            <SportMetricCard title="En attente" value={waitlistCount} description="Joueurs placés en liste d’attente sur les sondages." tone={waitlistCount > 0 ? "amber" : "slate"} icon={<Users className="h-4 w-4" />} />
            <SportMetricCard title="Absents ou incertains" value={absentCount + maybeCount} description={`${absentCount} absents · ${maybeCount} peut-être.`} tone="sky" icon={<CircleAlert className="h-4 w-4" />} />
          </div>

          <ActivityTimeline
            title="Activité récente"
            description="Matchs, sondages, alimentations, cotisations et dépenses triés par date."
            items={sortedActivityItems}
            emptyLabel="Aucune activité récente pour le moment."
          />
        </div>

        <aside className="space-y-3" aria-labelledby="quick-actions-title">
          <div className="rounded-[2rem] border border-white/75 bg-white/72 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Raccourcis</p>
            <h2 id="quick-actions-title" className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
              Piloter sans chercher
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Les accès que l’admin utilise le plus souvent.</p>
          </div>
          <QuickActionCard href="/admin/sondages" label="Sondages" description="Ouvrir, suspendre, clôturer." icon={<ClipboardList className="h-4 w-4" />} tone="emerald" />
          <QuickActionCard href="/admin/matchs" label="Matchs" description="Créer et gérer les rendez-vous." icon={<Volleyball className="h-4 w-4" />} tone="sky" />
          <QuickActionCard href="/admin/joueurs" label="Joueurs" description="Comptes, statuts, accès." icon={<Users className="h-4 w-4" />} tone="slate" />
          <QuickActionCard href="/admin/alimentations" label="Portefeuilles" description="Alimentations et reçus." icon={<WalletCards className="h-4 w-4" />} tone="amber" />
          <QuickActionCard href="/admin/depenses" label="Dépenses" description="Suivi des sorties." icon={<TrendingDown className="h-4 w-4" />} tone="rose" />
          <QuickActionCard href="/admin/parametres" label="Paramètres" description="Logo, seuils, WhatsApp." icon={<Settings className="h-4 w-4" />} tone="slate" />
        </aside>
      </section>

      <div className="sr-only" aria-live="polite">
        Chargement terminé.
      </div>
    </div>
  );
}
