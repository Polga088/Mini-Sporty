import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type PriorityItem = {
  href: string;
  label: string;
  description: string;
  count: number;
  badgeLabel: string;
  tone: "success" | "warning" | "error" | "info" | "neutral";
  icon: ReactNode;
};

const toneClasses: Record<PriorityItem["tone"], string> = {
  success: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
  warning: "border-amber-300/20 bg-amber-400/10 text-amber-100",
  error: "border-rose-300/20 bg-rose-400/10 text-rose-100",
  info: "border-sky-300/20 bg-sky-400/10 text-sky-100",
  neutral: "border-slate-300/20 bg-white/10 text-slate-100"
};

export function PriorityPanel({ items }: { items: PriorityItem[] }) {
  return (
    <section className="relative h-full overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:p-6" aria-labelledby="priority-panel-title">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(245,158,11,0.22),transparent_26%),radial-gradient(circle_at_100%_18%,rgba(16,185,129,0.2),transparent_28%)]" aria-hidden="true" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">À traiter</p>
        <h2 id="priority-panel-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
          Les décisions du jour
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Ce qui mérite un clic maintenant, sans bruit autour.</p>
      </div>

      <div className="relative mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" aria-hidden="true" />
              <div>
                <p className="font-semibold text-white">Tout est à jour</p>
                <p className="mt-1 text-sm leading-6 text-emerald-100">Aucune action urgente pour le moment.</p>
              </div>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block rounded-3xl border border-white/10 bg-white/[0.08] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <div className="flex items-start gap-3">
                <span className={cn("rounded-2xl border p-2 transition", toneClasses[item.tone])} aria-hidden="true">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{item.label}</span>
                    <StatusBadge label={item.badgeLabel} tone={item.tone} />
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-300">{item.description}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-2xl font-semibold tabular-nums text-white">{item.count}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-200" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
