import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TopUpStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import {
  paymentMethodLabel,
  topUpStatusLabel,
  topUpStatusVariant
} from "@/lib/topup-receipt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoticeBanner } from "@/components/notice-banner";
import { ConfirmButton } from "@/components/confirm-button";
import { cancelTopUp, requestTopUp } from "@/app/actions/wallet";
import { redirect } from "next/navigation";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function emptyLabel(label: string) {
  return <div className="rounded-xl border border-dashed px-4 py-4 text-sm text-slate-500">{label}</div>;
}

export default async function WalletsPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);

  const player = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      wallet: {
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { createdBy: true }
          }
        }
      },
      topUps: {
        orderBy: { createdAt: "desc" },
        include: {
          reviewedBy: true,
          receiptGeneratedBy: true
        }
      }
    }
  });

  if (!player) {
    redirect("/connexion");
  }

  const balance = player.wallet?.balance ?? 0;
  const topUps = player.topUps;
  const transactions = player.wallet?.transactions ?? [];

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardDescription>Solde actuel</CardDescription>
          <CardTitle className="mt-2 text-3xl">{formatDh(balance)}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Demandes</CardDescription>
          <CardTitle className="mt-2 text-3xl">{topUps.length}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Dernière mise à jour</CardDescription>
          <CardTitle className="mt-2 text-2xl">
            {player.wallet ? format(player.wallet.updatedAt, "dd/MM/yyyy", { locale: fr }) : "—"}
          </CardTitle>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Demander une alimentation</CardTitle>
              <CardDescription className="max-w-2xl">
                Le montant doit être positif. Une demande passe d’abord en attente avant validation par un administrateur.
              </CardDescription>
            </div>
            {session.user.isAdmin ? (
              <Button asChild variant="ghost">
                <Link href="/admin/alimentations">Gérer les alimentations</Link>
              </Button>
            ) : null}
          </div>

          <form action={requestTopUp} className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="amount">Montant</Label>
              <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Moyen de paiement</Label>
              <select id="paymentMethod" name="paymentMethod" className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement bancaire</option>
                <option value="MOBILE_PAYMENT">Paiement mobile</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" name="note" placeholder="Facultatif" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="proofUrl">Justificatif (lien)</Label>
              <Input id="proofUrl" name="proofUrl" type="url" placeholder="https://..." />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Envoyer la demande</Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardTitle>Résumé du portefeuille</CardTitle>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Nom</p>
              <p className="font-medium">{player.name}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Email</p>
              <p className="font-medium">{player.email}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Téléphone</p>
              <p className="font-medium">{player.phone ?? "Non renseigné"}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Statut</p>
              <p className="font-medium">{player.isActive ? "Actif" : "Inactif"}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-slate-600">Wallet</p>
            <p className="text-base font-medium">{player.wallet ? "Présent" : "Manquant"}</p>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Historique des demandes</CardTitle>
          <CardDescription className="max-w-2xl">
            Suivi des demandes d’alimentation, du statut PENDING jusqu’à l’approbation ou l’annulation.
          </CardDescription>
          <div className="mt-4 space-y-3">
            {topUps.length === 0 ? (
              emptyLabel("Aucune demande d’alimentation pour le moment.")
            ) : (
              topUps.map((topUp) => {
                const receiptReady = topUp.status === TopUpStatus.APPROVED && Boolean(topUp.receiptNumber);
                const receiptUrl = `/admin/alimentations/${topUp.id}/recu`;

                return (
                  <div key={topUp.id} className="rounded-2xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{formatDh(topUp.amount)}</p>
                        <p className="text-sm text-slate-600">{paymentMethodLabel(topUp.paymentMethod)}</p>
                      </div>
                      <Badge variant={topUpStatusVariant(topUp.status)}>{topUpStatusLabel(topUp.status)}</Badge>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                      <p>Créée le {format(topUp.createdAt, "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
                      <p>Reçu: {topUp.receiptNumber ?? "—"}</p>
                      <p>Note: {topUp.note ?? "Aucune"}</p>
                      <p>Validée par: {topUp.reviewedBy?.name ?? "—"}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {topUp.status === TopUpStatus.PENDING ? (
                        <form action={cancelTopUp}>
                          <input type="hidden" name="topUpId" value={topUp.id} />
                          <ConfirmButton type="submit" variant="destructive" message="Annuler cette demande d’alimentation ?">
                            Annuler la demande
                          </ConfirmButton>
                        </form>
                      ) : null}

                      {receiptReady ? (
                        <Button asChild variant="secondary">
                          <Link href={receiptUrl}>Voir le reçu</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Dernières transactions</CardTitle>
          <CardDescription className="max-w-2xl">
            Les dix dernières opérations du wallet apparaissent ici avec l’auteur de l’ajustement quand il existe.
          </CardDescription>
          <div className="mt-4 overflow-hidden rounded-2xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Auteur</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={4}>
                      Aucune transaction pour le moment.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t">
                      <td className="px-4 py-3">{format(transaction.createdAt, "dd/MM/yyyy", { locale: fr })}</td>
                      <td className="px-4 py-3">{transaction.type}</td>
                      <td className="px-4 py-3">{formatDh(transaction.amount)}</td>
                      <td className="px-4 py-3">{transaction.createdBy?.name ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
