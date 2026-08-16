import { ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { loginWithCredentials, registerPlayerAndRedirect } from "@/app/actions/registrations";
import { NoticeBanner } from "@/components/notice-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "register";

function authLinkClass(active: boolean) {
  return [
    "rounded-xl px-3 py-2 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
    active ? "bg-slate-950 text-white shadow-soft" : "text-slate-600 hover:text-slate-950"
  ].join(" ");
}

export default function PublicAuthPortal({
  defaultMode = "login",
  success,
  error
}: {
  defaultMode?: AuthMode;
  success?: string;
  error?: string;
}) {
  const mode = defaultMode === "register" ? "register" : "login";

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-2 py-3 text-white min-[360px]:px-4 min-[360px]:py-5 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-6xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.06] shadow-[0_30px_120px_rgba(0,0,0,0.36)] backdrop-blur min-[360px]:min-h-[calc(100vh-2.5rem)] min-[360px]:rounded-[2rem] lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)]" aria-label="Portail Mini Sporty">
        <div className="relative min-h-72 overflow-hidden p-4 min-[360px]:p-5 sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(16,185,129,0.34),transparent_28%),radial-gradient(circle_at_82%_0%,rgba(255,255,255,0.18),transparent_20%),linear-gradient(145deg,rgba(15,23,42,0.5),rgba(2,6,23,0.92))]" aria-hidden="true" />
          <div className="absolute inset-x-4 bottom-5 top-24 rounded-[1.5rem] border border-emerald-200/15 bg-[linear-gradient(90deg,rgba(16,185,129,0.12)_1px,transparent_1px),linear-gradient(180deg,rgba(16,185,129,0.10)_1px,transparent_1px)] bg-[size:46px_46px] min-[360px]:inset-x-8 min-[360px]:bottom-8 min-[360px]:top-28 min-[360px]:rounded-[2rem]" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-emerald-200/20 football-goal-line" />
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/20" />
            <div className="football-ball absolute bottom-10 left-8 flex h-10 w-10 items-center justify-center rounded-full border border-slate-900 bg-white text-[11px] font-black text-slate-950 shadow-xl">MS</div>
          </div>

          <div className="relative flex min-h-full flex-col justify-between gap-10">
            <div>
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-emerald-100 min-[360px]:text-xs min-[360px]:tracking-[0.22em]">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                Mini Sporty
              </div>
              <h1 className="mt-5 max-w-xl text-[2.05rem] font-semibold leading-[1.05] tracking-[-0.04em] min-[360px]:text-[2.35rem] sm:text-5xl sm:leading-[0.98] lg:text-6xl">Entre sur le terrain</h1>
              <p className="mt-4 max-w-sm text-base leading-7 text-slate-300">Ton équipe, tes matchs, ton portefeuille.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {["Match vendredi", "Wallet prêt", "Esprit collectif"].map((label) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-sm font-medium text-slate-100">
                  <Sparkles className="mb-3 h-4 w-4 text-emerald-300" aria-hidden="true" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 bg-white p-4 text-slate-950 min-[360px]:p-5 sm:p-8 lg:p-10">
          <nav className="inline-grid min-h-12 w-full grid-cols-2 rounded-2xl bg-slate-100 p-1" aria-label="Choix du parcours">
            <a href="/connexion" className={authLinkClass(mode === "login")} aria-current={mode === "login" ? "page" : undefined}>
              Se connecter
            </a>
            <a href="/connexion?mode=register" className={authLinkClass(mode === "register")} aria-current={mode === "register" ? "page" : undefined}>
              Créer mon compte
            </a>
          </nav>

          <NoticeBanner success={success} error={error} />

          {mode === "register" ? (
            <div className="mt-7">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700" aria-hidden="true">
                  <span className="text-lg font-black">+</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Inscription</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Créer ton compte</h2>
                </div>
              </div>

              <form className="mt-6 space-y-4" action={registerPlayerAndRedirect}>
                <div>
                  <Label htmlFor="register-name">Nom complet</Label>
                  <Input id="register-name" name="name" required minLength={2} maxLength={80} placeholder="Yassine Benali" autoComplete="name" />
                </div>
                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input id="register-email" name="email" type="email" required maxLength={120} placeholder="joueur@exemple.ma" autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="register-phone">Téléphone</Label>
                  <Input id="register-phone" name="phone" type="tel" required minLength={6} maxLength={30} placeholder="+212 600 000 000" autoComplete="tel" inputMode="tel" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="register-password">Mot de passe</Label>
                    <Input id="register-password" name="password" type="password" required minLength={10} placeholder="Minimum 10 caractères" autoComplete="new-password" />
                  </div>
                  <div>
                    <Label htmlFor="register-confirm-password">Confirmation</Label>
                    <Input id="register-confirm-password" name="confirmPassword" type="password" required minLength={10} placeholder="Répète le mot de passe" autoComplete="new-password" />
                  </div>
                </div>
                <label className="flex min-h-11 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  <input className="mt-1 h-4 w-4 accent-emerald-600" type="checkbox" name="acceptRules" required />
                  <span>J’accepte les règles internes de l’équipe Mini Sporty.</span>
                </label>
                <Button type="submit" className="w-full">
                  Créer mon compte
                </Button>
              </form>
            </div>
          ) : (
            <div className="mt-7">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700" aria-hidden="true">
                  <span className="text-lg">••</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Connexion</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Accéder à Mini Sporty</h2>
                </div>
              </div>

              <form className="mt-6 space-y-4" action={loginWithCredentials}>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="joueur@entreprise.ma" autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" name="password" type="password" required placeholder="••••••••" autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full">
                  Se connecter
                </Button>
              </form>
            </div>
          )}

          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            <p>{mode === "login" ? "Un compte en attente ne peut pas entrer dans l’application." : "Après inscription, l’administrateur valide ton accès avant la première connexion."}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
