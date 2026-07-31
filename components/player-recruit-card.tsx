import { CheckCircle2, Goal, Shield, Sparkles, Trophy, Users } from "lucide-react";
import type { ReactNode } from "react";

export function PlayerRecruitCard() {
  return (
    <aside className="relative min-h-full overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:p-6" aria-label="Ambiance football Mini Sporty">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.45),transparent_34%),radial-gradient(circle_at_95%_22%,rgba(59,130,246,0.24),transparent_34%)]" aria-hidden="true" />
      <div className="absolute -right-16 top-10 h-40 w-40 rounded-full border border-white/10" aria-hidden="true" />
      <div className="absolute bottom-8 left-0 right-0 h-px bg-emerald-200/25 football-goal-line" aria-hidden="true" />

      <div className="relative flex h-full flex-col justify-between gap-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Recrutement
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">Un nouveau joueur entre sur le terrain.</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
            Compte, wallet et premier solde sont prêts en une seule action. Simple, clair, sans friction mobile.
          </p>
        </div>

        <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.08] p-4">
          <div className="relative h-28 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,rgba(16,185,129,0.24),rgba(15,23,42,0.2))]">
            <div className="absolute inset-x-6 top-1/2 h-px bg-white/20" aria-hidden="true" />
            <div className="absolute right-6 top-8 h-14 w-10 rounded-r-xl border-y border-r border-emerald-200/70" aria-hidden="true">
              <Goal className="absolute -left-3 top-4 h-5 w-5 text-emerald-100" aria-hidden="true" />
            </div>
            <div className="football-ball absolute bottom-8 left-8 flex h-9 w-9 items-center justify-center rounded-full border border-slate-900 bg-white text-[10px] font-black text-slate-950 shadow-lg" aria-hidden="true">
              MS
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <RecruitStat icon={<Users className="h-4 w-4" />} label="Rôle" value="PLAYER" />
            <RecruitStat icon={<Trophy className="h-4 w-4" />} label="Wallet" value="Auto" />
            <RecruitStat icon={<CheckCircle2 className="h-4 w-4" />} label="Accès" value="Sécurisé" />
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" aria-hidden="true" />
          <p className="text-sm leading-6 text-emerald-50">Le mot de passe temporaire est remis par l’admin, puis le joueur le change à sa prochaine connexion.</p>
        </div>
      </div>
    </aside>
  );
}

function RecruitStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
      <div className="flex items-center gap-2 text-emerald-100">
        {icon}
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}
