import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TopUpStatus, WalletTransactionType } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { paymentMethodLabel, topUpStatusLabel, topUpStatusVariant } from "@/lib/topup-receipt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoticeBanner } from "@/components/notice-banner";
import { ConfirmButton } from "@/components/confirm-button";
import { cancelTopUp, requestTopUp } from "@/app/actions/wallet";
import { PremiumWalletCard, WalletFormShell, WalletInfoPanel, WalletInfoRow, WalletTimeline, WalletTrustNote, type WalletTimelineItem } from "@/components/premium-wallet";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MS";
}

function formatDateTime(date: Date) {
  return format(date, "d MMM yyyy · HH:mm", { locale: fr });
}

function transactionTitle(type: WalletTransactionType, description: string | null) {
  if (description) return description;
  if (type === WalletTransactionType.TOP_UP) return "Alimentation";
  if (type === WalletTransactionType.MATCH_PAYMENT) return "Participation vendredi";
  if (type === WalletTransactionType.REFUND) return "Remboursement";
  if (type === WalletTransactionType.MANUAL_CREDIT) return "Crédit manuel";
  if (type === WalletTransactionType.MANUAL_DEBIT) return "Débit manuel";
  if (type === WalletTransactionType.CONTRIBUTION_PAYMENT) return "Cotisation";
  return "Mouvement wallet";
}

function transactionTone(type: WalletTransactionType, amount: unknown): WalletTimelineItem["tone"] {
  if (type === WalletTransactionType.TOP_UP || type === WalletTransactionType.REFUND || type === WalletTransactionType.MANUAL_CREDIT || type === WalletTransactionType.BONUS) return "credit";
  if (Number(amount) < 0) return "debit";
  return "debit";
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
            take: 12,
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
  const lastTopUp = topUps.find((topUp) => topUp.status === TopUpStatus.APPROVED);
  const latestReceiptTopUp = topUps.find((topUp) => topUp.status === TopUpStatus.APPROVED && topUp.receiptNumber);
  const lowBalance = Number(balance) < 20;

  const transactionItems: WalletTimelineItem[] = transactions.map((transaction) => ({
    id: transaction.id,
    title: transactionTitle(transaction.type, transaction.description),
    dateLabel: formatDateTime(transaction.createdAt),
    amount: Math.abs(Number(transaction.amount)),
    statusLabel: transaction.type === WalletTransactionType.TOP_UP ? "Validée" : "Confirmée",
    tone: transactionTone(transaction.type, transaction.amount),
    href: transaction.referenceType === "WalletTopUp" && transaction.referenceId ? `/admin/alimentations/${transaction.referenceId}/recu` : undefined
  }));

  return (
    <div className="space-y-7">
      <NoticeBanner success={success} error={error} />

      <PremiumWalletCard
        playerName={player.name}
        playerEmail={player.email}
        avatarLabel={initials(player.name)}
        balance={balance.toString()}
        stateLabel={lowBalance ? "Solde à renforcer" : "Prêt à jouer"}
        stateTone={lowBalance ? "warning" : "success"}
        walletId={player.wallet?.id}
        lastTopUpLabel={lastTopUp ? `${formatDh(lastTopUp.amount)} · ${formatDateTime(lastTopUp.reviewedAt ?? lastTopUp.updatedAt)}` : "pas encore validée"}
        receiptHref={latestReceiptTopUp ? `/admin/alimentations/${latestReceiptTopUp.id}/recu` : null}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <WalletFormShell>
          <form action={requestTopUp} className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="amount">Montant</Label>
              <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required placeholder="50" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Moyen de paiement</Label>
              <select id="paymentMethod" name="paymentMethod" className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement bancaire</option>
                <option value="MOBILE_PAYMENT">Paiement mobile</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" name="note" placeholder="Ex: alimentation avant le match" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="proofUrl">Justificatif</Label>
              <Input id="proofUrl" name="proofUrl" type="url" placeholder="Lien facultatif vers votre justificatif" className="mt-1" />
            </div>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <Button type="submit" className="w-full bg-emerald-500 text-white hover:bg-emerald-600 sm:w-auto">
                Envoyer ma demande
              </Button>
              {session.user.isAdmin ? (
                <Button asChild variant="ghost">
                  <Link href="/admin/alimentations">Voir côté admin</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </WalletFormShell>

        <WalletInfoPanel>
          <WalletInfoRow label="Email" value={player.email} />
          <WalletInfoRow label="Téléphone" value={player.phone ?? "À compléter"} />
          <WalletInfoRow label="Dernière mise à jour" value={player.wallet ? formatDateTime(player.wallet.updatedAt) : "Wallet en attente"} />
          <WalletTrustNote />
        </WalletInfoPanel>
      </section>

      <section id="historique" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-[2rem] border border-white/75 bg-white/82 p-5 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Historique</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Votre timeline wallet</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Les derniers mouvements, lisibles comme un relevé moderne.</p>
            </div>
          </div>
          <div className="mt-5">
            <WalletTimeline items={transactionItems} emptyLabel="Aucun mouvement pour le moment. Votre première alimentation apparaîtra ici." />
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/75 bg-white/82 p-5 shadow-sm backdrop-blur sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Demandes</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Suivi des alimentations</h2>
          <div className="mt-5 space-y-3">
            {topUps.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">Aucune demande pour le moment.</div>
            ) : (
              topUps.slice(0, 6).map((topUp) => {
                const receiptReady = topUp.status === TopUpStatus.APPROVED && Boolean(topUp.receiptNumber);
                return (
                  <div key={topUp.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="whitespace-nowrap text-xl font-semibold text-slate-950">{formatDh(topUp.amount)}</p>
                        <p className="mt-1 text-sm text-slate-500">{paymentMethodLabel(topUp.paymentMethod)}</p>
                      </div>
                      <Badge variant={topUpStatusVariant(topUp.status)}>{topUpStatusLabel(topUp.status)}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{formatDateTime(topUp.createdAt)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {topUp.status === TopUpStatus.PENDING ? (
                        <form action={cancelTopUp}>
                          <input type="hidden" name="topUpId" value={topUp.id} />
                          <ConfirmButton type="submit" variant="destructive" message="Annuler cette demande ?">
                            Annuler
                          </ConfirmButton>
                        </form>
                      ) : null}
                      {receiptReady ? (
                        <Button asChild variant="secondary">
                          <Link href={`/admin/alimentations/${topUp.id}/recu`}>Votre reçu</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
