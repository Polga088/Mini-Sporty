import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!session.user.isAdmin) redirect("/espace");

  const [players, wallets, matches, contributions, topUps] = await Promise.all([
    prisma.user.count({ where: { role: "PLAYER" } }),
    prisma.wallet.findMany({ select: { balance: true } }),
    prisma.match.count(),
    prisma.contribution.count(),
    prisma.walletTopUp.count({ where: { status: "PENDING" } })
  ]);

  const totalBalance = wallets.reduce((sum: number, wallet: (typeof wallets)[number]) => sum + Number(wallet.balance), 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Card><CardDescription>Joueurs</CardDescription><CardTitle className="mt-2 text-3xl">{players}</CardTitle></Card>
      <Card><CardDescription>Matchs</CardDescription><CardTitle className="mt-2 text-3xl">{matches}</CardTitle></Card>
      <Card><CardDescription>Cotisations</CardDescription><CardTitle className="mt-2 text-3xl">{contributions}</CardTitle></Card>
      <Card><CardDescription>Demandes en attente</CardDescription><CardTitle className="mt-2 text-3xl">{topUps}</CardTitle></Card>
      <Card><CardDescription>Solde global</CardDescription><CardTitle className="mt-2 text-3xl">{formatDh(totalBalance)}</CardTitle></Card>
    </div>
  );
}
