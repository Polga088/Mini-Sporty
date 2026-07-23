import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoticeBanner } from "@/components/notice-banner";
import { ConfirmButton } from "@/components/confirm-button";
import { PlayerActionsMenu } from "@/components/player-actions-menu";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { createManualWalletAdjustment, disablePlayer, deletePlayer, enablePlayer, resetPlayerPassword, updatePlayer } from "@/app/actions/players";
import { Role } from "@prisma/client";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function emptyLabel(label: string) {
  return <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-slate-500">{label}</div>;
}

export default async function PlayerDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<QueryParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");

  const { id } = await Promise.resolve(params);
  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);

  const player = await prisma.user.findUnique({
    where: { id },
    include: {
      wallet: {
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            include: { createdBy: true }
          }
        }
      },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 20
      },
      topUps: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { reviewedBy: true }
      },
      participatedMatches: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { match: true }
      },
      contributionParticipants: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { contribution: true, walletTransaction: true }
      }
    }
  });

  if (!player || player.role !== Role.PLAYER) {
    notFound();
  }

  const balance = player.wallet?.balance ?? 0;
  const walletTransactions = player.wallet?.transactions ?? [];

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardDescription>Solde actuel</CardDescription>
          <CardTitle className="mt-2 text-3xl">{formatDh(balance)}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Statut</CardDescription>
          <CardTitle className="mt-2 text-3xl">{player.isActive ? "Actif" : "Inactif"}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Matchs</CardDescription>
          <CardTitle className="mt-2 text-3xl">{player.participatedMatches.length}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Créé le</CardDescription>
          <CardTitle className="mt-2 text-2xl">
            {format(player.createdAt, "dd/MM/yyyy", { locale: fr })}
          </CardTitle>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription className="max-w-2xl">
            Modifiez l’identité du joueur ou son statut actif/inactif. Le solde n’est jamais modifié ici.
          </CardDescription>
          <form action={updatePlayer} className="mt-4 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="playerId" value={player.id} />
            <div>
              <Label htmlFor="name">Nom</Label>
              <Input id="name" name="name" defaultValue={player.name} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={player.email} required />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" defaultValue={player.phone ?? ""} placeholder="Facultatif" />
            </div>
            <div>
              <Label htmlFor="isActive">Statut</Label>
              <select
                id="isActive"
                name="isActive"
                defaultValue={String(player.isActive)}
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
              >
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Enregistrer les modifications</Button>
            </div>
          </form>
          <div className="mt-4">
            <PlayerActionsMenu
              playerId={player.id}
              playerName={player.name}
              isActive={player.isActive}
              returnTo={`/admin/joueurs/${player.id}`}
              disableAction={disablePlayer}
              enableAction={enablePlayer}
              resetPasswordAction={resetPlayerPassword}
              deleteAction={deletePlayer}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>Ajuster le portefeuille</CardTitle>
          <CardDescription className="max-w-xl">
            Crée une transaction manuelle de crédit ou débit avec balance avant et après. Le débit ne peut jamais rendre le solde négatif.
          </CardDescription>
          <form action={createManualWalletAdjustment} className="mt-4 space-y-4">
            <input type="hidden" name="playerId" value={player.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="adjustmentType">Type</Label>
                <select id="adjustmentType" name="adjustmentType" className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                  <option value="CREDIT">Crédit</option>
                  <option value="DEBIT">Débit</option>
                </select>
              </div>
              <div>
                <Label htmlFor="amount">Montant</Label>
                <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required />
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Motif</Label>
              <Input id="reason" name="reason" placeholder="Motif obligatoire" required />
            </div>
            <ConfirmButton
              type="submit"
              message={`Valider l’ajustement de portefeuille pour ${player.name} ?`}
            >
              Valider l’ajustement
            </ConfirmButton>
          </form>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Résumé du compte</CardTitle>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Email</p>
              <p className="font-medium">{player.email}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Téléphone</p>
              <p className="font-medium">{player.phone ?? "Non renseigné"}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Wallet</p>
              <p className="font-medium">{player.wallet ? "Présent" : "Manquant"}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">Identifiant</p>
              <p className="font-medium text-xs">{player.id}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Dernières notifications</CardTitle>
          <div className="mt-4 space-y-3">
            {player.notifications.length === 0
              ? emptyLabel("Aucune notification pour ce joueur.")
              : player.notifications.map((notification) => (
                  <div key={notification.id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-3">
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

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Historique des transactions</CardTitle>
          <div className="mt-4 overflow-hidden rounded-2xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Solde après</th>
                </tr>
              </thead>
              <tbody>
                {walletTransactions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                      Aucune transaction.
                    </td>
                  </tr>
                ) : (
                  walletTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t">
                      <td className="px-4 py-3">{format(transaction.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })}</td>
                      <td className="px-4 py-3">{transaction.type}</td>
                      <td className="px-4 py-3">{formatDh(transaction.amount)}</td>
                      <td className="px-4 py-3">{formatDh(transaction.balanceAfter)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardTitle>Historique des matchs</CardTitle>
          <div className="mt-4 space-y-3">
            {player.participatedMatches.length === 0
              ? emptyLabel("Aucun match associé.")
              : player.participatedMatches.map((participant) => (
                  <div key={participant.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{participant.match.title}</p>
                        <p className="text-sm text-slate-600">
                          {format(participant.match.matchDate, "dd/MM/yyyy", { locale: fr })} · {participant.match.startTime} - {participant.match.endTime}
                        </p>
                      </div>
                      <Badge>{participant.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Paiement: {participant.paymentStatus} · {formatDh(participant.amountCharged)}
                    </p>
                  </div>
                ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Alimentations</CardTitle>
          <div className="mt-4 space-y-3">
            {player.topUps.length === 0
              ? emptyLabel("Aucune alimentation.")
              : player.topUps.map((topUp) => (
                  <div key={topUp.id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{formatDh(topUp.amount)}</p>
                        <p className="text-sm text-slate-600">{topUp.paymentMethod}</p>
                      </div>
                      <Badge variant={topUp.status === "APPROVED" ? "success" : topUp.status === "REJECTED" ? "danger" : "warning"}>
                        {topUp.status}
                      </Badge>
                    </div>
                    {topUp.note ? <p className="mt-2 text-sm text-slate-600">{topUp.note}</p> : null}
                  </div>
                ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Cotisations</CardTitle>
          <div className="mt-4 space-y-3">
            {player.contributionParticipants.length === 0
              ? emptyLabel("Aucune cotisation.")
              : player.contributionParticipants.map((item) => (
                  <div key={item.id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{item.contribution.title}</p>
                        <p className="text-sm text-slate-600">{formatDh(item.amount)}</p>
                      </div>
                      <Badge variant={item.status === "PAID" ? "success" : item.status === "FAILED" ? "danger" : "default"}>
                        {item.status}
                      </Badge>
                    </div>
                    {item.walletTransaction ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Transaction liée: {item.walletTransaction.type} · {formatDh(item.walletTransaction.amount)}
                      </p>
                    ) : null}
                  </div>
                ))}
          </div>
        </Card>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" type="button" asChild>
          <Link href="/admin/joueurs">Retour à la liste</Link>
        </Button>
      </div>
    </div>
  );
}
