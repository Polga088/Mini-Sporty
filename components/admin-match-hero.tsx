import Link from "next/link";
import { CalendarDays, MapPin, Users, Volleyball } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { formatDh } from "@/lib/money";
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
    <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-700">
      <span className="shrink-0 text-emerald-700" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

export function AdminMatchHero({ match }: { match: AdminMatchHeroData | null }) {
  if (!match) {
    return (
      <EmptyState
        title="Aucun match à venir"
        description="Créez le prochain rendez-vous pour lancer les inscriptions."
        actionHref="/admin/matchs/nouveau"
        actionLabel="Créer un match"
        icon={<Volleyball className="h-5 w-5" />}
      />
    );
  }

  const safeCapacity = Math.max(0, match.capacity);
  const progress = safeCapacity > 0 ? Math.min(100, Math.round((match.confirmedCount / safeCapacity) * 100)) : 0;
  const remainingPlaces = Math.max(0, safeCapacity - match.confirmedCount);
  const capacityLabel = safeCapacity > 0 ? `${match.confirmedCount} / ${safeCapacity} confirmés` : `${match.confirmedCount} confirmés`;

  return (
    <Card className="relative overflow-hidden border-emerald-200 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_34%),linear-gradient(135deg,#ffffff_0%,#ecfdf5_100%)] p-5 sm:p-6">
      <div className="absolute right-4 top-4 hidden h-16 w-16 rounded-full border border-emerald-200/80 sm:block" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={match.statusLabel} tone={match.statusTone} />
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">Prochain rendez-vous</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">{match.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Le match le plus proche non annulé, affiché avec ses participants réels.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MatchMeta icon={<CalendarDays className="h-4 w-4" />} label={`${match.dateLabel} · ${match.timeLabel}`} />
            <MatchMeta icon={<MapPin className="h-4 w-4" />} label={match.location} />
            <MatchMeta icon={<Users className="h-4 w-4" />} label={capacityLabel} />
            <MatchMeta icon={<Volleyball className="h-4 w-4" />} label={formatDh(match.participationFee)} />
          </div>
        </div>

        <div className="w-full rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm lg:max-w-sm">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">Remplissage</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{progress}%</p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href={`/admin/matchs/${match.id}`}>Voir le match</Link>
            </Button>
          </div>
          <div
            className="mt-4 h-2.5 rounded-full bg-slate-200"
            role="progressbar"
            aria-label="Progression des confirmations du prochain match"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="h-2.5 rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">{remainingPlaces} places restantes</span>
            {match.waitlistCount > 0 ? <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">{match.waitlistCount} en liste d’attente</span> : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
