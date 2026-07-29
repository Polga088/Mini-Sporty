import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Trophy, Users, Volleyball } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDh } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import type { ReactNode } from "react";

export type AdminMatchHeroData = {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  participationFee: Prisma.Decimal | string | number;
  statusLabel: string;
  statusTone: "success" | "warning" | "error" | "info" | "neutral";
};

function MatchMeta({ icon, label }: { icon: ReactNode; label: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 backdrop-blur">
      <span className="shrink-0 text-emerald-200" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

export function AdminMatchHero({ match }: { match: AdminMatchHeroData | null }) {
  if (!match) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-emerald-300 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_52%,#eff6ff_100%)] p-5 shadow-sm sm:p-6">
        <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-300/20 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800" aria-hidden="true">
              <Volleyball className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Aucun match à venir</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Créez le prochain rendez-vous quand le terrain est confirmé. Le dashboard restera sobre tant qu’aucun match réel n’existe.</p>
          </div>
          <Button asChild className="w-full shrink-0 sm:w-auto">
            <Link href="/admin/matchs/nouveau">Créer un match</Link>
          </Button>
        </div>
      </div>
    );
  }

  const safeCapacity = Math.max(0, match.capacity);
  const progress = safeCapacity > 0 ? Math.min(100, Math.round((match.confirmedCount / safeCapacity) * 100)) : 0;
  const remainingPlaces = Math.max(0, safeCapacity - match.confirmedCount);
  const capacityLabel = safeCapacity > 0 ? `${match.confirmedCount} / ${safeCapacity} confirmés` : `${match.confirmedCount} confirmés`;
  const statusToneClass = {
    success: "border-emerald-300/40 bg-emerald-400/15 text-emerald-100",
    warning: "border-amber-300/40 bg-amber-400/15 text-amber-100",
    error: "border-rose-300/40 bg-rose-400/15 text-rose-100",
    info: "border-sky-300/40 bg-sky-400/15 text-sky-100",
    neutral: "border-slate-300/40 bg-slate-400/15 text-slate-100"
  }[match.statusTone];

  return (
    <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_30px_90px_rgba(15,23,42,0.24)] sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.36),transparent_28%),radial-gradient(circle_at_92%_4%,rgba(59,130,246,0.22),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.02),rgba(15,23,42,0.86))]" aria-hidden="true" />
      <div className="absolute left-1/2 top-0 hidden h-full w-px bg-white/10 lg:block" aria-hidden="true" />
      <div className="absolute -right-16 bottom-6 hidden h-48 w-48 rounded-full border border-white/10 xl:block" aria-hidden="true" />
      <div className="absolute -right-8 bottom-16 hidden h-24 w-24 rounded-full border border-white/10 xl:block" aria-hidden="true" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-end">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", statusToneClass)}>{match.statusLabel}</span>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">Prochain coup d’envoi</span>
          </div>
          <div>
            <h2 className="text-3xl font-semibold leading-tight tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl">{match.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Le prochain match confirmé par les données réelles: horaire, terrain, places et tarif.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MatchMeta icon={<CalendarDays className="h-4 w-4" />} label={`${match.dateLabel} · ${match.timeLabel}`} />
            <MatchMeta icon={<MapPin className="h-4 w-4" />} label={match.location} />
            <MatchMeta icon={<Users className="h-4 w-4" />} label={capacityLabel} />
            <MatchMeta icon={<Volleyball className="h-4 w-4" />} label={formatDh(match.participationFee)} />
          </div>
        </div>

        <div className="w-full rounded-[1.75rem] border border-white/10 bg-white/[0.08] p-4 shadow-2xl backdrop-blur">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Remplissage</p>
              <p className="mt-1 text-5xl font-semibold tabular-nums tracking-[-0.06em] text-white">{progress}%</p>
            </div>
            <Button asChild variant="secondary" className="shrink-0 bg-white text-slate-950 hover:bg-emerald-50">
              <Link href={`/admin/matchs/${match.id}`}>
                Voir le match
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div
            className="mt-5 h-3 rounded-full bg-white/15"
            role="progressbar"
            aria-label="Progression des confirmations du prochain match"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="h-3 rounded-full bg-gradient-to-r from-emerald-300 to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.45)]" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-100">
            <span className="rounded-full bg-white/10 px-3 py-1">{remainingPlaces} places libres</span>
            {match.waitlistCount > 0 ? <span className="rounded-full bg-sky-300/15 px-3 py-1 text-sky-100">{match.waitlistCount} en attente</span> : null}
            {remainingPlaces === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-3 py-1 text-amber-100">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                Complet
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
