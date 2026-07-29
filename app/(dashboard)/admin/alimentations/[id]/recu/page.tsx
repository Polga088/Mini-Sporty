import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { buildPremiumTopUpWhatsappMessage, buildReceiptVerificationPayload } from "@/lib/topup-receipt";
import { getTopUpReceiptData } from "@/lib/topup-receipt-data";
import { buildQrSvg } from "@/lib/qr";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { NoticeBanner } from "@/components/notice-banner";
import { ReceiptCard } from "@/components/receipt-card";
import { ReceiptActions } from "./receipt-actions";
import { ReceiptShareControls } from "./receipt-share-controls";

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
  const { id } = await params;
  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);
  const shareToken = firstValue(query.token);

  const { session, topUp, transaction, verificationHash } = await getTopUpReceiptData(id, shareToken);
  const receiptNumber = topUp.receiptNumber!;
  const receiptIssuedAt = topUp.receiptIssuedAt!;
  const reviewedByName = topUp.reviewedBy!.name;
  const receiptPdfUrl = shareToken ? `/admin/alimentations/${topUp.id}/recu/pdf?token=${encodeURIComponent(shareToken)}` : `/admin/alimentations/${topUp.id}/recu/pdf`;
  const receiptPngUrl = shareToken ? `/admin/alimentations/${topUp.id}/recu/png?token=${encodeURIComponent(shareToken)}` : `/admin/alimentations/${topUp.id}/recu/png`;
  const qrPayload = buildReceiptVerificationPayload({ receiptNumber, verificationHash });
  const qrSvg = await buildQrSvg(qrPayload, 320);
  const shareLinkActive =
    Boolean(topUp.receiptShareTokenHash) &&
    Boolean(topUp.receiptShareTokenExpiresAt) &&
    !topUp.receiptShareTokenRevokedAt;
  const whatsappMessage = buildPremiumTopUpWhatsappMessage({
    amount: topUp.amount.toString(),
    receiptNumber,
    balanceAfter: transaction.balanceAfter.toString()
  });

  return (
    <div className="space-y-6 print:space-y-0">
      <NoticeBanner success={success} error={error} />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Paiement confirmé</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-slate-950">Votre reçu</h1>
        </div>
        <Button asChild variant="ghost">
          <Link href="/admin/alimentations">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Alimentations
          </Link>
        </Button>
      </div>

      <ReceiptCard
        receipt={{
          receiptNumber,
          playerName: topUp.user.name,
          playerContact: topUp.user.phone ?? topUp.user.email,
          amount: topUp.amount,
          balanceBefore: transaction.balanceBefore,
          balanceAfter: transaction.balanceAfter,
          issuedAt: receiptIssuedAt,
          paymentMethod: topUp.paymentMethod,
          validatorName: reviewedByName,
          transactionId: transaction.id,
          verificationHash,
          note: topUp.note,
          qrSvg
        }}
      />

      <section className="mx-auto flex max-w-[760px] flex-wrap gap-3 rounded-[2rem] border border-white/75 bg-white/82 p-4 shadow-sm backdrop-blur print:hidden">
        <ReceiptActions
          pdfUrl={receiptPdfUrl}
          pngUrl={receiptPngUrl}
          receiptNumber={receiptNumber}
          whatsappMessage={whatsappMessage}
        />
      </section>

      {session?.user?.id && canAccessSensitiveAdmin(session.user.role) ? (
        <section className="mx-auto max-w-[760px] print:hidden">
          <ReceiptShareControls
            topUpId={topUp.id}
            activeUntil={shareLinkActive && topUp.receiptShareTokenExpiresAt ? format(topUp.receiptShareTokenExpiresAt, "dd/MM/yyyy à HH:mm", { locale: fr }) : null}
          />
        </section>
      ) : null}
    </div>
  );
}
