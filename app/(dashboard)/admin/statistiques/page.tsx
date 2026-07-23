import { auth } from "@/auth";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDh } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";

type QueryParams = Record<string, string | string[] | undefined>;
type PeriodKey = "all" | "30d" | "90d" | "year";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getPeriodRange(period: PeriodKey) {
  const now = new Date();
  if (period === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (period === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
}

export default async function AdminStatisticsPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");

  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const period = (firstValue(query.period) ?? "30d") as PeriodKey;
  const from = getPeriodRange(period);
  const whereDate = from
    ? {
        createdAt: {
          gte: from
        }
      }
    : {};

  const [players, matches, contributions, expenses, wallets, topUps, matchParticipants, transactions] = await Promise.all([
    prisma.user.findMany({ where: { role: "PLAYER" }, select: { id: true, name: true } }),
    prisma.match.findMany({ where: { ...whereDate }, include: { participants: true } }),
    prisma.contribution.findMany({ where: { ...whereDate } }),
    prisma.expense.findMany({ where: { ...whereDate } }),
    prisma.wallet.findMany({ include: { user: true } }),
    prisma.walletTopUp.findMany({ where: { ...whereDate } }),
    prisma.matchParticipant.findMany({
      where: {
        match: from ? { matchDate: { gte: from } } : undefined
      },
      include: { user: true, match: true }
    }),
    prisma.walletTransaction.findMany({
      where: {
        ...(from ? { createdAt: { gte: from } } : {})
      }
    })
  ]);

  const statsByPlayer = players.map((player) => {
    const participations = matchParticipants.filter((row) => row.userId === player.id);
    return {
      name: player.name,
      matchesPlayed: participations.filter((row) => row.status === "CONFIRMED" || row.status === "ATTENDED").length,
      present: participations.filter((row) => row.status === "ATTENDED").length,
      absent: participations.filter((row) => row.status === "ABSENT").length,
      waitlisted: participations.filter((row) => row.status === "WAITLISTED").length,
      debited: transactions
        .filter((tx) => tx.createdById === player.id && ["MATCH_PAYMENT", "CONTRIBUTION_PAYMENT", "MANUAL_DEBIT"].includes(tx.type))
        .reduce((sum, tx) => sum + Number(tx.amount), 0),
      toppedUp: topUps.filter((topUp) => topUp.userId === player.id && topUp.status === "APPROVED").reduce((sum, topUp) => sum + Number(topUp.amount), 0)
    };
  });

  const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0);
  const totalDebited = transactions
    .filter((tx) => ["MATCH_PAYMENT", "CONTRIBUTION_PAYMENT", "MANUAL_DEBIT"].includes(tx.type))
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalCredited = transactions
    .filter((tx) => ["TOP_UP", "MANUAL_CREDIT", "BONUS", "ADJUSTMENT", "REFUND"].includes(tx.type))
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const presenceRate = matchParticipants.length > 0 ? Math.round((matchParticipants.filter((row) => row.status === "ATTENDED").length / matchParticipants.length) * 100) : 0;
  const absenceRate = matchParticipants.length > 0 ? Math.round((matchParticipants.filter((row) => row.status === "ABSENT").length / matchParticipants.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Statistiques</CardTitle>
            <CardDescription className="max-w-2xl">
              Vue consolidée des présences, des montants et de l’activité financière.
            </CardDescription>
          </div>
          <Button asChild variant="ghost">
            <a href={`/admin/statistiques/export.csv?period=${period}`}>Exporter CSV</a>
          </Button>
        </div>
        <form method="get" className="mt-4 flex flex-wrap gap-2">
          {(["30d", "90d", "year", "all"] as PeriodKey[]).map((value) => (
            <Button key={value} asChild variant={period === value ? "default" : "ghost"} className="px-3 py-1 text-xs">
              <a href={`/admin/statistiques?period=${value}`}>{value === "30d" ? "30 jours" : value === "90d" ? "90 jours" : value === "year" ? "Année" : "Tout"}</a>
            </Button>
          ))}
        </form>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardDescription>Solde global</CardDescription>
          <CardTitle className="mt-2 text-3xl">{formatDh(totalBalance)}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Débits</CardDescription>
          <CardTitle className="mt-2 text-3xl">{formatDh(totalDebited)}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Crédits</CardDescription>
          <CardTitle className="mt-2 text-3xl">{formatDh(totalCredited)}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Présence</CardDescription>
          <CardTitle className="mt-2 text-3xl">{presenceRate}%</CardTitle>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardDescription>Absences</CardDescription>
          <CardTitle className="mt-2 text-3xl">{absenceRate}%</CardTitle>
        </Card>
        <Card>
          <CardDescription>Matchs</CardDescription>
          <CardTitle className="mt-2 text-3xl">{matches.length}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Contributions</CardDescription>
          <CardTitle className="mt-2 text-3xl">{contributions.length}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Dépenses</CardDescription>
          <CardTitle className="mt-2 text-3xl">{expenses.length}</CardTitle>
        </Card>
      </section>

      <Card>
        <CardTitle>Participation par joueur</CardTitle>
        <div className="mt-4 space-y-3">
          {statsByPlayer.map((player) => (
            <div key={player.name} className="rounded-2xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{player.name}</p>
                  <p className="text-sm text-slate-600">
                    Matchs joués: {player.matchesPlayed} · Présents: {player.present} · Absents: {player.absent} · Liste d’attente: {player.waitlisted}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">{formatDh(player.toppedUp)}</Badge>
                  <Badge variant="warning">{formatDh(player.debited)}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
