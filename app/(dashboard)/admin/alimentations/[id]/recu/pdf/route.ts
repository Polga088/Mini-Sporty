import { NextResponse } from "next/server";
import { TopUpStatus, WalletTransactionType } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildPdfBuffer } from "@/lib/pdf";
import { formatDh } from "@/lib/money";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { paymentMethodLabel } from "@/lib/topup-receipt";
import { canAccessSensitiveAdmin } from "@/lib/permissions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }
  if (!canAccessSensitiveAdmin(session.user.role)) {
    return NextResponse.redirect(new URL("/espace", request.url));
  }

  const { id } = await params;
  const topUp = await prisma.walletTopUp.findUnique({
    where: { id },
    include: {
      user: { include: { wallet: true } },
      reviewedBy: true
    }
  });

  if (!topUp || topUp.status !== TopUpStatus.APPROVED || !topUp.receiptNumber || !topUp.receiptIssuedAt || !topUp.reviewedBy || !topUp.user.wallet) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
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
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const pdf = buildPdfBuffer(
    [
      { text: "Reçu de paiement Friday Match Wallet", bold: true, size: 16 },
      { text: `Numéro du reçu: ${topUp.receiptNumber}`, bold: true, size: 12, spacingBefore: 10 },
      { text: `Joueur: ${topUp.user.name}` },
      { text: `Email: ${topUp.user.email}` },
      { text: `Téléphone: ${topUp.user.phone ?? "Non renseigné"}` },
      { text: `Montant payé: ${formatDh(topUp.amount)}`, bold: true, spacingBefore: 10 },
      { text: `Moyen de paiement: ${paymentMethodLabel(topUp.paymentMethod)}` },
      { text: `Date de paiement: ${format(topUp.receiptIssuedAt, "dd/MM/yyyy à HH:mm", { locale: fr })}` },
      { text: `Ancien solde: ${formatDh(transaction.balanceBefore)}` },
      { text: `Nouveau solde: ${formatDh(transaction.balanceAfter)}` },
      { text: `Administrateur validateur: ${topUp.reviewedBy.name}` },
      { text: "Paiement reçu", bold: true, size: 14, spacingBefore: 12 },
      { text: `Référence transaction: ${transaction.id}` },
      { text: `Note: ${topUp.note ?? "Aucune"}` },
      { text: `Justificatif: ${topUp.proofUrl ?? "Aucun"}` }
    ],
    "Friday Match Wallet"
  );

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recu-${topUp.receiptNumber}.pdf"`
    }
  });
}
