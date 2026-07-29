import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Clock3, CreditCard, History, Plus, QrCode, ReceiptText, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDh } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type PremiumWalletCardProps = {
  playerName: string;
  playerEmail: string;
  avatarLabel: string;
  balance: string | number;
  stateLabel: string;
  stateTone: "success" | "warning" | "danger";
  walletId?: string | null;
  lastTopUpLabel: string;
  receiptHref?: string | null;
};

export function PremiumWalletCard({
  playerName,
  playerEmail,
  avatarLabel,
  balance,
  stateLabel,
  stateTone,
  walletId,
  lastTopUpLabel,
  receiptHref
}: PremiumWalletCardProps) {
  return (
    <section className="group relative max-w-full overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_34px_110px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_42px_130px_rgba(15,23,42,0.34)] sm:rounded-[2.4rem] sm:p-6" aria-labelledby="wallet-title">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.42),transparent_30%),radial-gradient(circle_at_92%_18%,rgba(59,130,246,0.25),transparent_31%),linear-gradient(140deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.84)_72%)]" aria-hidden="true" />
      <div className="absolute -right-20 bottom-8 h-52 w-52 rounded-full border border-white/10" aria-hidden="true" />
      <div className="absolute right-10 bottom-20 h-24 w-24 rounded-full border border-white/10" aria-hidden="true" />

      <div className="relative">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-slate-950 shadow-lg">{avatarLabel}</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">Mini Sporty Wallet</p>
              <h1 id="wallet-title" className="mt-1 truncate text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">{playerName}</h1>
              <p className="truncate text-sm text-slate-300">{playerEmail}</p>
            </div>
          </div>
          <Badge variant={stateTone} className={cn("max-w-[5.5rem] shrink-0 justify-center whitespace-normal text-center leading-tight sm:max-w-none sm:whitespace-nowrap", stateTone === "success" ? "bg-emerald-300 text-emerald-950" : undefined)}>{stateLabel}</Badge>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_160px] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm text-slate-300">Solde disponible</p>
            <p className="mt-2 whitespace-nowrap text-[clamp(2.45rem,12vw,4rem)] font-semibold tracking-[-0.07em] text-white sm:text-6xl">{formatDh(balance)}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-slate-200">
              <span className="rounded-full bg-white/10 px-3 py-1">Dernière alimentation: {lastTopUpLabel}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">Wallet {walletId ? walletId.slice(0, 8).toUpperCase() : "à créer"}</span>
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-white/10 bg-white p-3 text-slate-950">
            <div className="flex items-center justify-between">
              <QrCode className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            </div>
            <div className="mt-3 grid aspect-square grid-cols-5 gap-1 rounded-2xl bg-slate-50 p-2" aria-label="QR portefeuille décoratif">
              {Array.from({ length: 25 }, (_, index) => (
                <span key={index} className={cn("rounded-[0.35rem]", [0, 1, 5, 6, 18, 19, 23, 24, 8, 12, 16].includes(index) ? "bg-slate-950" : index % 3 === 0 ? "bg-emerald-500" : "bg-slate-200")} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-2 sm:grid-cols-3">
          <Button asChild className="bg-emerald-500 text-white hover:bg-emerald-600">
            <Link href="#alimenter">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Alimenter
            </Link>
          </Button>
          <Button asChild variant="secondary" className="bg-white text-slate-950 hover:bg-emerald-50">
            <Link href="#historique">
              <History className="h-4 w-4" aria-hidden="true" />
              Historique
            </Link>
          </Button>
          {receiptHref ? (
            <Button asChild variant="secondary" className="bg-white/90 text-slate-950 hover:bg-white">
              <Link href={receiptHref}>
                <ReceiptText className="h-4 w-4" aria-hidden="true" />
                Reçu
              </Link>
            </Button>
          ) : (
            <Button type="button" variant="secondary" disabled className="bg-white/25 text-white/85 disabled:opacity-80">
              <ReceiptText className="h-4 w-4" aria-hidden="true" />
              Reçu
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

export type WalletTimelineItem = {
  id: string;
  title: string;
  dateLabel: string;
  amount: string | number;
  statusLabel: string;
  tone: "credit" | "debit" | "neutral";
  icon?: ReactNode;
  href?: string;
};

export function WalletTimeline({ items, emptyLabel }: { items: WalletTimelineItem[]; emptyLabel: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-600">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => {
        const positive = item.tone === "credit";
        const content = (
          <span className="flex items-center gap-3">
            <span className={cn("inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", positive ? "bg-emerald-100 text-emerald-700" : item.tone === "debit" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700")}>
              {item.icon ?? (positive ? <ArrowDownLeft className="h-5 w-5" /> : item.tone === "debit" ? <ArrowUpRight className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-950">{item.title}</span>
              <span className="mt-1 block text-sm text-slate-500">{item.dateLabel}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className={cn("block whitespace-nowrap text-lg font-semibold tabular-nums", positive ? "text-emerald-700" : item.tone === "debit" ? "text-rose-700" : "text-slate-700")}>
                {positive ? "+" : item.tone === "debit" ? "-" : ""}
                {formatDh(item.amount)}
              </span>
              <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{item.statusLabel}</span>
            </span>
            {item.href ? <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700 sm:block" aria-hidden="true" /> : null}
          </span>
        );

        return (
          <li key={item.id}>
            {item.href ? (
              <Link href={item.href} className="group block rounded-3xl border border-white/75 bg-white/82 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2">
                {content}
              </Link>
            ) : (
              <div className="rounded-3xl border border-white/75 bg-white/82 p-4 shadow-sm">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function WalletFormShell({ children }: { children: ReactNode }) {
  return (
    <section id="alimenter" className="rounded-[2rem] border border-white/75 bg-white/82 p-5 shadow-sm backdrop-blur sm:p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700" aria-hidden="true">
          <CreditCard className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Alimenter</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Ajouter du budget</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Envoyez votre demande, l’équipe valide et votre reçu apparaît automatiquement.</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function WalletInfoPanel({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-[2rem] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:p-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300 text-emerald-950" aria-hidden="true">
          <WalletCards className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Profil wallet</p>
          <h2 className="text-xl font-semibold text-white">Prêt pour vendredi</h2>
        </div>
      </div>
      <div className="mt-5 space-y-3">{children}</div>
    </aside>
  );
}

export function WalletInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 break-words font-semibold text-white">{value}</p>
    </div>
  );
}

export function WalletTrustNote() {
  return (
    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
      <div className="flex gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" aria-hidden="true" />
        <p className="text-sm leading-6 text-emerald-50">Chaque validation garde l’ancien solde, le nouveau solde et un reçu partageable.</p>
      </div>
    </div>
  );
}
