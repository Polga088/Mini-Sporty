import { NextResponse } from "next/server";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { buildReceiptPdfBuffer } from "@/lib/pdf";
import { formatDh } from "@/lib/money";
import { buildReceiptVerificationPayload, paymentMethodLabel } from "@/lib/topup-receipt";
import { resolveTopUpReceiptData } from "@/lib/topup-receipt-data";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const result = await resolveTopUpReceiptData(id, token);

  if (!result.ok) {
    if (result.reason === "login") {
      return NextResponse.redirect(new URL("/connexion", request.url));
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const { topUp, transaction, verificationHash } = result.data;
  const receiptNumber = topUp.receiptNumber!;
  const receiptIssuedAt = topUp.receiptIssuedAt!;
  const reviewedByName = topUp.reviewedBy!.name;
  const qrPayload = buildReceiptVerificationPayload({ receiptNumber, verificationHash });

  const pdf = buildReceiptPdfBuffer({
    receiptNumber,
    playerName: topUp.user.name,
    playerContact: topUp.user.phone ?? topUp.user.email,
    amount: formatDh(topUp.amount),
    paymentMethod: paymentMethodLabel(topUp.paymentMethod),
    issuedAtLabel: format(receiptIssuedAt, "d MMM yyyy à HH:mm", { locale: fr }),
    balanceBefore: formatDh(transaction.balanceBefore),
    balanceAfter: formatDh(transaction.balanceAfter),
    validatorName: reviewedByName,
    transactionId: transaction.id,
    verificationHash,
    qrPayload,
    note: topUp.note
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recu-${receiptNumber}.pdf"`,
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
