import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { redirect } from "next/navigation";

export default async function EspacePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const [wallet, matches, notifications, transactions] = await Promise.all([
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
    })
  ]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardDescription>Solde actuel</CardDescription>
          <CardTitle className="mt-2 text-3xl">{formatDh(wallet?.balance ?? 0)}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Statut</CardDescription>
          <CardTitle className="mt-2 text-3xl">{session.user.isAdmin ? "Administrateur" : "Joueur"}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Alertes</CardDescription>
          <CardTitle className="mt-2 text-3xl">{(notifications ?? []).filter((n: (typeof notifications)[number]) => !n.isRead).length}</CardTitle>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Prochains matchs</CardTitle>
          <div className="mt-4 space-y-3">
            {matches.map((match: (typeof matches)[number]) => (
              <div key={match.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{match.title}</p>
                    <p className="text-sm text-slate-600">
                      {format(match.matchDate, "EEEE d MMMM yyyy", { locale: fr })} · {match.startTime} - {match.endTime}
                    </p>
                  </div>
                  <Badge>{match.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{match.location}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Notifications récentes</CardTitle>
          <div className="mt-4 space-y-3">
            {notifications.map((notification: (typeof notifications)[number]) => (
              <div key={notification.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{notification.title}</p>
                  <Badge variant={notification.isRead ? "default" : "warning"}>
                    {notification.isRead ? "Lue" : "Non lue"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <CardTitle>Dernières transactions</CardTitle>
        <div className="mt-4 overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Solde après</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction: (typeof transactions)[number]) => (
                <tr key={transaction.id} className="border-t">
                  <td className="px-4 py-3">{transaction.type}</td>
                  <td className="px-4 py-3">{formatDh(transaction.amount)}</td>
                  <td className="px-4 py-3">{formatDh(transaction.balanceAfter)}</td>
                  <td className="px-4 py-3">{transaction.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
