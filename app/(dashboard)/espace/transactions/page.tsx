import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const transactions = await prisma.walletTransaction.findMany({
    where: { wallet: { userId: session.user.id } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <Card>
      <CardTitle>Historique financier</CardTitle>
      <div className="mt-4 overflow-hidden rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Avant</th>
              <th className="px-4 py-3">Après</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx: (typeof transactions)[number]) => (
              <tr key={tx.id} className="border-t">
                <td className="px-4 py-3">{format(tx.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })}</td>
                <td className="px-4 py-3">{tx.type}</td>
                <td className="px-4 py-3">{formatDh(tx.amount)}</td>
                <td className="px-4 py-3">{formatDh(tx.balanceBefore)}</td>
                <td className="px-4 py-3">{formatDh(tx.balanceAfter)}</td>
                <td className="px-4 py-3">{tx.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
