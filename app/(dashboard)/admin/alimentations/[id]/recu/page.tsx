import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TopUpStatus, WalletTransactionType } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { buildTopUpWhatsappMessage, paymentMethodLabel } from "@/lib/topup-receipt";
import { ensureApprovedTopUpReceipt } from "@/lib/topup-receipt-ensure";
import { canAccessTopUpReceipt } from "@/lib/receipt-access";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { NoticeBanner } from "@/components/notice-banner";
import { getAppSettings } from "@/lib/settings";
import { ReceiptActions } from "./receipt-actions";
import { ReceiptShareControls } from "./receipt-share-controls";
import { unstable_noStore as noStore } from "next/cache";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TopUpReceiptPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<QueryParams>;
}) {
  noStore();
  const session = await auth();

  const { id } = await params;
  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);
  const shareToken = firstValue(query.token);

  const topUp = await prisma.walletTopUp.findUnique({
    where: { id },
    include: {
      user: { include: { wallet: true } },
      reviewedBy: true,
      receiptGeneratedBy: true
    }
  });

  if (!topUp) {
    notFound();
  }

  if (!canAccessTopUpReceipt({ user: session?.user, topUp, shareToken })) {
    if (!session?.user?.id && !shareToken) {
      redirect("/connexion");
    }
    notFound();
  }

  if (topUp.status === TopUpStatus.APPROVED && (!topUp.receiptNumber || !topUp.receiptIssuedAt)) {
    await ensureApprovedTopUpReceipt(topUp.id, session?.user?.id);
    const refreshedTopUp = await prisma.walletTopUp.findUnique({
      where: { id },
      include: {
        user: { include: { wallet: true } },
        reviewedBy: true,
        receiptGeneratedBy: true
      }
    });

    if (!refreshedTopUp) {
      notFound();
    }

    Object.assign(topUp, refreshedTopUp);
  }

  if (topUp.status !== TopUpStatus.APPROVED || !topUp.receiptNumber || !topUp.receiptIssuedAt || !topUp.user.wallet || !topUp.reviewedBy) {
    notFound();
  }

  const transaction = await prisma.walletTransaction.findFirst({
    where: {
      referenceType: "WalletTopUp",
      referenceId: topUp.id,
      type: WalletTransactionType.TOP_UP
    },
    orderBy: { createdAt: "desc" }
  });

  if (!transaction) {
    notFound();
  }

  const settings = await getAppSettings();
  const shareLinkActive =
    Boolean(topUp.receiptShareTokenHash) &&
    Boolean(topUp.receiptShareTokenExpiresAt) &&
    !topUp.receiptShareTokenRevokedAt;
  const receiptPdfUrl = shareToken
    ? `/admin/alimentations/${topUp.id}/recu/pdf?token=${encodeURIComponent(shareToken)}`
    : `/admin/alimentations/${topUp.id}/recu/pdf`;

  const whatsappMessage = buildTopUpWhatsappMessage({
    playerName: topUp.user.name,
    amount: topUp.amount.toString(),
    receiptNumber: topUp.receiptNumber,
    balanceAfter: transaction.balanceAfter.toString(),
    template: settings.whatsappTemplate
  });

  return (
    <div className="space-y-6 print:space-y-4">
      <NoticeBanner success={success} error={error} />

      <Card className="print:border-0 print:bg-white print:p-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Friday Match Wallet</p>
            <CardTitle className="mt-2 text-3xl">Reçu de paiement</CardTitle>
            <CardDescription className="max-w-2xl">Paiement reçu et enregistré dans l’historique du portefeuille.</CardDescription>
          </div>
          <div className="text-right">
            <Badge variant="success">Paiement reçu</Badge>
            <p className="mt-2 text-sm text-slate-600">Numéro du reçu</p>
            <p className="text-lg font-semibold">{topUp.receiptNumber}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Joueur</p>
            <p className="mt-1 font-semibold">{topUp.user.name}</p>
            <p className="text-sm text-slate-600">{topUp.user.email}</p>
            {topUp.user.phone ? <p className="text-sm text-slate-600">{topUp.user.phone}</p> : null}
          </div>
          <div className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Montant payé</p>
            <p className="mt-1 text-2xl font-semibold">{formatDh(topUp.amount)}</p>
            <p className="text-sm text-slate-600">{paymentMethodLabel(topUp.paymentMethod)}</p>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Date de paiement</p>
            <p className="mt-1 font-semibold">{format(topUp.receiptIssuedAt, "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
            <p className="text-sm text-slate-600">Validé par {topUp.reviewedBy.name}</p>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ancien solde</p>
            <p className="mt-1 text-xl font-semibold">{formatDh(transaction.balanceBefore)}</p>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Nouveau solde</p>
            <p className="mt-1 text-xl font-semibold">{formatDh(transaction.balanceAfter)}</p>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Référence transaction</p>
            <p className="mt-1 break-all text-sm font-medium">{transaction.id}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Reçu généré par</p>
            <p className="mt-1 font-semibold">{topUp.receiptGeneratedBy?.name ?? topUp.reviewedBy.name}</p>
            <p className="text-sm text-slate-600">Référence portefeuille: {topUp.user.wallet.id}</p>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Message WhatsApp</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{whatsappMessage}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <ReceiptActions
            pdfUrl={receiptPdfUrl}
            receiptNumber={topUp.receiptNumber}
            whatsappMessage={whatsappMessage}
          />
          {session?.user?.id && canAccessSensitiveAdmin(session.user.role) ? (
            <ReceiptShareControls
              topUpId={topUp.id}
              activeUntil={shareLinkActive && topUp.receiptShareTokenExpiresAt ? format(topUp.receiptShareTokenExpiresAt, "dd/MM/yyyy à HH:mm", { locale: fr }) : null}
            />
          ) : null}
          <Button asChild variant="ghost">
            <Link href="/admin/alimentations">Retour à la liste</Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 print:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Paiement reçu</p>
            <p className="mt-6 text-sm text-slate-600">Signature de l’administrateur</p>
            <div className="mt-10 border-t pt-3 text-sm text-slate-500">____________________________</div>
          </div>
          <div className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Détails additionnels</p>
            <p className="mt-2 text-sm text-slate-700">{topUp.note ?? "Aucune note"}</p>
            <p className="mt-2 text-sm text-slate-700">
              {topUp.proofUrl ? (
                <a href={topUp.proofUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
                  Justificatif
                </a>
              ) : (
                "Aucun justificatif"
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
