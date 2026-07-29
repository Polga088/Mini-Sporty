import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Fingerprint, QrCode, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDh } from "@/lib/money";
import { paymentMethodLabel } from "@/lib/topup-receipt";
import type { PaymentMethod, Prisma } from "@prisma/client";

export type ReceiptCardData = {
  receiptNumber: string;
  playerName: string;
  playerContact: string;
  amount: Prisma.Decimal | string | number;
  balanceBefore: Prisma.Decimal | string | number;
  balanceAfter: Prisma.Decimal | string | number;
  issuedAt: Date;
  paymentMethod: PaymentMethod;
  validatorName: string;
  transactionId: string;
  verificationHash: string;
  note?: string | null;
  qrSvg?: string | null;
};

export function ReceiptCard({ receipt }: { receipt: ReceiptCardData }) {
  return (
    <article className="receipt-card relative mx-auto w-full max-w-[760px] overflow-hidden rounded-[2.4rem] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_34px_110px_rgba(15,23,42,0.32)] sm:p-7 print:max-w-none print:rounded-[1.4rem] print:border-slate-200 print:bg-white print:text-slate-950 print:shadow-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,0.42),transparent_30%),radial-gradient(circle_at_92%_18%,rgba(59,130,246,0.24),transparent_30%),linear-gradient(140deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.88)_72%)] print:hidden" aria-hidden="true" />
      <div className="absolute -right-20 top-16 h-56 w-56 rounded-full border border-white/10 print:hidden" aria-hidden="true" />
      <div className="absolute right-10 top-24 h-24 w-24 rounded-full border border-white/10 print:hidden" aria-hidden="true" />

      <div className="relative">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100 print:border-emerald-200 print:bg-emerald-50 print:text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Mini Sporty
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl print:text-slate-950">Votre reçu</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 print:text-slate-600">Paiement confirmé et ajouté au portefeuille Mini Sporty.</p>
          </div>
          <div className="flex items-center gap-3 sm:text-right">
            <Badge variant="success" className="bg-emerald-300 text-emerald-950 print:bg-emerald-100 print:text-emerald-800">
              VALIDÉ
            </Badge>
            <CheckCircle2 className="h-9 w-9 text-emerald-300 print:text-emerald-700" aria-hidden="true" />
          </div>
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 backdrop-blur print:border-slate-200 print:bg-slate-50">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 print:text-emerald-700">Montant reçu</p>
            <p className="mt-3 whitespace-nowrap text-5xl font-semibold tracking-[-0.07em] text-white sm:text-6xl print:text-slate-950">{formatDh(receipt.amount)}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ReceiptField label="Joueur" value={receipt.playerName} strong />
              <ReceiptField label="Contact" value={receipt.playerContact} />
              <ReceiptField label="Paiement" value={paymentMethodLabel(receipt.paymentMethod)} />
              <ReceiptField label="Date" value={format(receipt.issuedAt, "d MMM yyyy · HH:mm", { locale: fr })} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white p-4 text-slate-950 print:border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">QR reçu</p>
              <QrCode className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </div>
            <div className="mt-3 flex aspect-square items-center justify-center rounded-3xl bg-slate-50 p-3">
              {receipt.qrSvg ? <div className="h-full w-full [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: receipt.qrSvg }} /> : <QrCode className="h-24 w-24 text-slate-300" aria-hidden="true" />}
            </div>
            <p className="mt-3 break-all text-xs leading-5 text-slate-500">{receipt.receiptNumber}</p>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <BalanceTile label="Ancien solde" value={formatDh(receipt.balanceBefore)} />
          <BalanceTile label="Nouveau solde" value={formatDh(receipt.balanceAfter)} highlight />
          <BalanceTile label="Validé par" value={receipt.validatorName} />
        </section>

        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 print:border-slate-200 print:bg-white">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 print:text-slate-500">Référence</p>
              <p className="mt-2 break-all text-sm font-medium text-slate-100 print:text-slate-800">{receipt.transactionId}</p>
              {receipt.note ? <p className="mt-3 text-sm leading-6 text-slate-300 print:text-slate-600">{receipt.note}</p> : null}
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 print:border-slate-200 print:bg-slate-50">
              <div className="flex items-center gap-2 text-emerald-200 print:text-emerald-700">
                <Fingerprint className="h-4 w-4" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">Hash</p>
              </div>
              <p className="mt-2 break-all font-mono text-sm text-white print:text-slate-950">{receipt.verificationHash}</p>
            </div>
          </div>
        </section>

        <footer className="mt-8 grid gap-4 sm:grid-cols-[1fr_220px] sm:items-end">
          <p className="text-sm leading-6 text-slate-300 print:text-slate-600">Merci. Ce reçu confirme uniquement l’alimentation validée, sans exposer de donnée sensible.</p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 print:text-slate-500">Signature</p>
            <div className="mt-8 border-t border-white/25 pt-3 text-sm text-slate-300 print:border-slate-300 print:text-slate-600">{receipt.validatorName}</div>
          </div>
        </footer>
      </div>
    </article>
  );
}

function ReceiptField({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 print:text-slate-500">{label}</p>
      <p className={strong ? "mt-1 font-semibold text-white print:text-slate-950" : "mt-1 text-sm text-slate-200 print:text-slate-700"}>{value}</p>
    </div>
  );
}

function BalanceTile({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-3xl border border-emerald-300/20 bg-emerald-300/12 p-4 print:border-emerald-200 print:bg-emerald-50" : "rounded-3xl border border-white/10 bg-white/[0.07] p-4 print:border-slate-200 print:bg-slate-50"}>
      <p className={highlight ? "text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100 print:text-emerald-700" : "text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 print:text-slate-500"}>{label}</p>
      <p className="mt-2 whitespace-nowrap text-xl font-semibold tracking-[-0.03em] text-white print:text-slate-950">{value}</p>
    </div>
  );
}
