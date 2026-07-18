import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContribution, debitContribution } from "@/app/actions/contributions";
import { redirect } from "next/navigation";

export default async function ContributionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const contributions = await prisma.contribution.findMany({
    orderBy: { createdAt: "desc" },
    include: { participants: true }
  });

  return (
    <div className="space-y-6">
      {session.user.isAdmin ? (
        <Card>
          <CardTitle>Créer une cotisation exceptionnelle</CardTitle>
          <form action={createContribution} className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input id="title" name="title" required />
            </div>
            <div>
              <Label htmlFor="amountPerPlayer">Montant par joueur</Label>
              <Input id="amountPerPlayer" name="amountPerPlayer" type="number" min="0.01" step="0.01" required />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" required />
            </div>
            <div>
              <Label htmlFor="targetAmount">Objectif total</Label>
              <Input id="targetAmount" name="targetAmount" type="number" step="0.01" />
            </div>
            <div>
              <Label htmlFor="dueDate">Échéance</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Créer la cotisation</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Cotisations</CardTitle>
        <div className="mt-4 space-y-4">
          {contributions.map((contribution: (typeof contributions)[number]) => (
            <div key={contribution.id} className="rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{contribution.title}</p>
                  <p className="text-sm text-slate-600">{contribution.description}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDh(contribution.amountPerPlayer)} par joueur
                    {contribution.targetAmount ? ` · Objectif ${formatDh(contribution.targetAmount)}` : ""}
                  </p>
                </div>
                <p className="text-sm font-medium">{contribution.status}</p>
              </div>
              {session.user.isAdmin ? (
                <form action={async () => {
                  "use server";
                  await debitContribution(contribution.id);
                }} className="mt-3">
                  <Button type="submit" variant="secondary">Débiter tous les joueurs</Button>
                </form>
              ) : null}
              <p className="mt-3 text-sm text-slate-600">
                Participants payés: {contribution.participants.filter((p: (typeof contribution.participants)[number]) => p.status === "PAID").length}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
