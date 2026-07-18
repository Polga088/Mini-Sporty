import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { createContribution, debitContribution } from "@/app/actions/contributions";
import { redirect } from "next/navigation";

export default async function AdminContributionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!session.user.isAdmin) redirect("/espace");

  const contributions = await prisma.contribution.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Créer une cotisation</CardTitle>
        <form action={createContribution} className="mt-4 flex flex-col gap-3">
          <input name="title" placeholder="Titre" className="rounded-xl border px-3 py-2" />
          <input name="description" placeholder="Description" className="rounded-xl border px-3 py-2" />
          <input name="amountPerPlayer" type="number" step="0.01" placeholder="Montant" className="rounded-xl border px-3 py-2" />
          <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white">Créer</button>
        </form>
      </Card>

      <Card>
        <CardTitle>Cotisations existantes</CardTitle>
        <div className="mt-4 space-y-3">
          {contributions.map((contribution: (typeof contributions)[number]) => (
            <div key={contribution.id} className="rounded-xl border p-4">
              <p className="font-medium">{contribution.title}</p>
              <form action={async () => {
                "use server";
                await debitContribution(contribution.id);
              }} className="mt-3">
                <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Débiter tout le monde</button>
              </form>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
