import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

function toCsv(rows: Array<Record<string, string | number | boolean | null | undefined>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const value = row[key];
          const escaped = String(value ?? "").replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
  ];
  return lines.join("\n");
}

export default async function AdminExportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!session.user.isAdmin) redirect("/espace");

  const [players, transactions] = await Promise.all([
    prisma.user.findMany({ where: { role: "PLAYER" }, select: { name: true, email: true, phone: true, isActive: true } }),
    prisma.walletTransaction.findMany({ select: { type: true, amount: true, balanceBefore: true, balanceAfter: true, description: true, createdAt: true } })
  ]);

  const playersCsv = toCsv(players);
  const transactionsCsv = toCsv(
      transactions.map((row: (typeof transactions)[number]) => ({
        ...row,
        amount: row.amount.toString(),
        balanceBefore: row.balanceBefore.toString(),
        balanceAfter: row.balanceAfter.toString(),
        createdAt: row.createdAt.toISOString()
      }))
    );

  return (
    <Card>
      <CardTitle>Exports CSV</CardTitle>
      <div className="mt-4 space-y-4">
        <a className="block rounded-xl border px-4 py-3 text-sm font-medium" href={`data:text/csv;charset=utf-8,${encodeURIComponent(playersCsv)}`} download="joueurs.csv">
          Télécharger les joueurs
        </a>
        <a className="block rounded-xl border px-4 py-3 text-sm font-medium" href={`data:text/csv;charset=utf-8,${encodeURIComponent(transactionsCsv)}`} download="transactions.csv">
          Télécharger les transactions
        </a>
      </div>
    </Card>
  );
}
