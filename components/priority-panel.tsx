import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
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

export function PriorityPanel({ items }: { items: PriorityItem[] }) {
  return (
    <Card className="h-full">
      <SectionHeader title="À traiter" description="Les actions qui demandent une attention administrative." />
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <div>
                <p className="font-semibold text-emerald-950">Tout est à jour</p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">Aucune action urgente pour le moment.</p>
              </div>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block rounded-2xl border bg-white/75 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
            >
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-slate-100 p-2 text-slate-700 transition group-hover:bg-white" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-950">{item.label}</span>
                    <StatusBadge label={item.badgeLabel} tone={item.tone} />
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{item.description}</span>
                </span>
                <span className="text-2xl font-semibold tabular-nums text-slate-950">{item.count}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}
