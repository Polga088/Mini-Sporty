import { NextResponse } from "next/server";
import { TopUpStatus, WalletTransactionType } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildPdfBuffer } from "@/lib/pdf";
import { formatDh } from "@/lib/money";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { paymentMethodLabel } from "@/lib/topup-receipt";
import { canAccessTopUpReceipt } from "@/lib/receipt-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const topUp = await prisma.walletTopUp.findUnique({
    where: { id },
    include: {
      user: { include: { wallet: true } },
      reviewedBy: true
    }
  });

  if (!topUp) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (!canAccessTopUpReceipt({ user: session?.user, topUp, shareToken: token })) {
    if (!session?.user?.id && !token) {
      return NextResponse.redirect(new URL("/connexion", request.url));
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (topUp.status !== TopUpStatus.APPROVED || !topUp.receiptNumber || !topUp.receiptIssuedAt || !topUp.reviewedBy || !topUp.user.wallet) {
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
      "Content-Disposition": `attachment; filename="recu-${topUp.receiptNumber}.pdf"`,
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
