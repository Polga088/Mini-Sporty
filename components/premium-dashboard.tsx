import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, Dumbbell, Loader2, ShieldCheck, Sparkles, TrendingDown, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

type Tone = "emerald" | "amber" | "rose" | "sky" | "slate";

const toneStyles: Record<Tone, { ring: string; icon: string; text: string; glow: string; chip: string }> = {
  emerald: {
    ring: "border-emerald-200/80 bg-emerald-50 text-emerald-950",
    icon: "bg-emerald-500 text-white",
    text: "text-emerald-700",
    glow: "from-emerald-500/22",
    chip: "bg-emerald-100 text-emerald-800"
  },
  amber: {
    ring: "border-amber-200/80 bg-amber-50 text-amber-950",
    icon: "bg-amber-500 text-white",
    text: "text-amber-700",
    glow: "from-amber-500/22",
    chip: "bg-amber-100 text-amber-900"
  },
  rose: {
    ring: "border-rose-200/80 bg-rose-50 text-rose-950",
    icon: "bg-rose-500 text-white",
    text: "text-rose-700",
    glow: "from-rose-500/22",
    chip: "bg-rose-100 text-rose-800"
  },
  sky: {
    ring: "border-sky-200/80 bg-sky-50 text-sky-950",
    icon: "bg-sky-500 text-white",
    text: "text-sky-700",
    glow: "from-sky-500/22",
    chip: "bg-sky-100 text-sky-800"
  },
  slate: {
    ring: "border-slate-200/80 bg-slate-50 text-slate-950",
    icon: "bg-slate-900 text-white",
    text: "text-slate-600",
    glow: "from-slate-500/16",
    chip: "bg-slate-100 text-slate-700"
  }
};

export type PremiumPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PremiumPageHeader({ eyebrow, title, description, action }: PremiumPageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-[2rem] border border-white/75 bg-slate-950 px-5 py-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(16,185,129,0.36),transparent_30%),radial-gradient(circle_at_86%_12%,rgba(59,130,246,0.22),transparent_32%)]" aria-hidden="true" />
      <div className="absolute -right-16 bottom-0 h-36 w-36 rounded-full border border-white/10" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

export type MetricCardProps = {
  label: string;
  value: ReactNode;
  hint: string;
  icon: ReactNode;
  tone?: Tone;
  wide?: boolean;
};

export function MetricCard({ label, value, hint, icon, tone = "slate", wide = false }: MetricCardProps) {
  const styles = toneStyles[tone];

  return (
    <Card className={cn("relative overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md", wide && "sm:col-span-2")}>
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r to-transparent", styles.glow)} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{value}</div>
        </div>
        <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm", styles.icon)} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">{hint}</p>
    </Card>
  );
}

export type FinanceCardProps = {
  balance: ReactNode;
  pendingTopUps: number;
  lowBalancePlayers: number;
  recentInflows: ReactNode;
  recentOutflows: ReactNode;
  alertThreshold: ReactNode;
};

export function FinanceCard({ balance, pendingTopUps, lowBalancePlayers, recentInflows, recentOutflows, alertThreshold }: FinanceCardProps) {
  return (
    <Card className="relative overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#ecfdf5_100%)] p-5 sm:p-6">
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-400/10 blur-2xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
            <WalletCards className="h-3.5 w-3.5" aria-hidden="true" />
            Finance
          </div>
          <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-3xl">{balance}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Solde total des portefeuilles joueurs actifs et historiques.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[24rem]">
          <FinancePill label="À valider" value={pendingTopUps} tone={pendingTopUps > 0 ? "amber" : "emerald"} />
          <FinancePill label="Soldes faibles" value={lowBalancePlayers} tone={lowBalancePlayers > 0 ? "rose" : "emerald"} />
          <FinancePill label="Entrées récentes" value={recentInflows} tone="emerald" />
          <FinancePill label="Sorties récentes" value={recentOutflows} tone="slate" />
        </div>
      </div>
      <p className="relative mt-4 text-xs text-slate-500">Alerte portefeuille sous {alertThreshold}.</p>
    </Card>
  );
}

function FinancePill({ label, value, tone }: { label: string; value: ReactNode; tone: Tone }) {
  const styles = toneStyles[tone];

  return (
    <div className={cn("rounded-2xl border px-4 py-3", styles.ring)}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-75">{label}</p>
      <p className="mt-1 whitespace-nowrap text-lg font-semibold tabular-nums tracking-[-0.02em]">{value}</p>
    </div>
  );
}

export type SportMetricCardProps = {
  title: string;
  value: ReactNode;
  description: string;
  progress?: number;
  tone?: Tone;
  icon?: ReactNode;
};

export function SportMetricCard({ title, value, description, progress, tone = "emerald", icon = <Dumbbell className="h-4 w-4" /> }: SportMetricCardProps) {
  const styles = toneStyles[tone];
  const safeProgress = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : null;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{value}</p>
        </div>
        <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", styles.chip)} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      {safeProgress !== null ? (
        <div
          className="mt-4 h-2.5 rounded-full bg-slate-100"
          role="progressbar"
          aria-label={`Progression ${title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safeProgress}
        >
          <div className={cn("h-2.5 rounded-full", tone === "amber" ? "bg-amber-500" : tone === "rose" ? "bg-rose-500" : tone === "sky" ? "bg-sky-500" : "bg-emerald-600")} style={{ width: `${safeProgress}%` }} />
        </div>
      ) : null}
    </Card>
  );
}

export type ActivityTimelineItem = {
  id: string;
  date: Date;
  href?: string;
  type: "match" | "poll" | "topup" | "contribution" | "expense";
  title: string;
  description: string;
  meta: string;
  tone?: Tone;
};

const activityIcons: Record<ActivityTimelineItem["type"], ReactNode> = {
  match: <Dumbbell className="h-4 w-4" />,
  poll: <ClipboardList className="h-4 w-4" />,
  topup: <WalletCards className="h-4 w-4" />,
  contribution: <ShieldCheck className="h-4 w-4" />,
  expense: <TrendingDown className="h-4 w-4" />
};

export function ActivityTimeline({ title, description, items, emptyLabel }: { title: string; description: string; items: ActivityTimelineItem[]; emptyLabel: string }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{title}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Ce qui vient de bouger</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="hidden rounded-2xl bg-slate-100 p-3 text-slate-700 sm:inline-flex" aria-hidden="true">
          <Sparkles className="h-5 w-5" />
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">{emptyLabel}</div>
      ) : (
        <ol className="mt-5 space-y-3">
          {items.map((item) => {
            const styles = toneStyles[item.tone ?? "slate"];
            const content = (
              <span className="flex items-start gap-3">
                <span className={cn("mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl", styles.chip)} aria-hidden="true">
                  {activityIcons[item.type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-950">{item.title}</span>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", styles.chip)}>{item.meta}</span>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{item.description}</span>
                </span>
                {item.href ? <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700" aria-hidden="true" /> : null}
              </span>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="group block rounded-3xl border border-transparent p-2 transition hover:border-emerald-200 hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2">
                    {content}
                  </Link>
                ) : (
                  <div className="rounded-3xl p-2">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

export type QuickActionCardProps = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
  tone?: Tone;
};

export function QuickActionCard({ href, label, description, icon, tone = "slate" }: QuickActionCardProps) {
  const styles = toneStyles[tone];

  return (
    <Link
      href={href}
      className="group flex min-h-28 items-start gap-3 rounded-3xl border border-white/75 bg-white/82 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
    >
      <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", styles.chip)} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="font-semibold text-slate-950">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-600">{description}</span>
      </span>
    </Link>
  );
}

export function SkeletonCard() {
  return (
    <Card className="p-5" aria-label="Chargement">
      <div className="flex animate-pulse items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-700" aria-hidden="true" />
        <div className="h-3 w-36 rounded-full bg-slate-200" />
      </div>
      <div className="mt-5 space-y-3">
        <div className="h-8 w-2/3 rounded-2xl bg-slate-100" />
        <div className="h-3 w-full rounded-full bg-slate-100" />
        <div className="h-3 w-4/5 rounded-full bg-slate-100" />
      </div>
    </Card>
  );
}

export function EmptyDashboardState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref: string; actionLabel: string }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-emerald-300 bg-emerald-50/70 p-5 text-center sm:p-6">
      <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-700" aria-hidden="true" />
      <h3 className="mt-3 text-lg font-semibold text-emerald-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-emerald-800">{description}</p>
      <Button asChild className="mt-4">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
