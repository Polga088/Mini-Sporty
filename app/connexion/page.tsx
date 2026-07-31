"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { LockKeyhole, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main className="flex min-h-screen items-center overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]" aria-label="Connexion Mini Sporty">
        <div className="relative min-h-56 overflow-hidden bg-slate-950 p-6 text-white sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.45),transparent_34%),radial-gradient(circle_at_95%_22%,rgba(59,130,246,0.24),transparent_34%)]" aria-hidden="true" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                Mini Sporty
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Retour au vestiaire.</h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">Connectez-vous, voyez le prochain match et gardez votre wallet prêt pour vendredi.</p>
            </div>

            <div className="relative h-20 rounded-3xl border border-white/10 bg-white/[0.08]" aria-hidden="true">
              <div className="absolute left-5 right-5 top-1/2 h-px bg-emerald-200/35 football-goal-line" />
              <div className="football-ball absolute bottom-5 left-6 flex h-8 w-8 items-center justify-center rounded-full border border-slate-900 bg-white text-[10px] font-black text-slate-950 shadow-lg">MS</div>
            </div>
          </div>
        </div>

        <div className="min-w-0 p-5 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700" aria-hidden="true">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Connexion</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Accéder à Mini Sporty</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Votre espace match, wallet et sondages.</p>
            </div>
          </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            setPending(true);
            setError(null);
            const result = await signIn("credentials", {
              email: String(formData.get("email") ?? ""),
              password: String(formData.get("password") ?? ""),
              redirect: false
            });
            setPending(false);

            if (result?.error) {
              setError("Connexion impossible. Vérifiez vos identifiants.");
              return;
            }

            window.location.href = "/";
          }}
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="joueur@entreprise.ma" autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" required placeholder="••••••••" autoComplete="current-password" />
          </div>
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            <p>Compte désactivé ou mot de passe temporaire ? Demandez à l’admin de vérifier votre accès.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
