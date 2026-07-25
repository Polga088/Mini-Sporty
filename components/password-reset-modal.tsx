"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { clearPasswordResetFlash } from "@/app/actions/players";

export function PasswordResetModal({
  playerName,
  temporaryPassword
}: {
  playerName: string;
  temporaryPassword: string;
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    void clearPasswordResetFlash();
  }, []);

  async function copyPassword() {
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg rounded-3xl border bg-white p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">Mot de passe temporaire</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{playerName}</h2>
        <p className="mt-3 text-sm text-slate-600">
          Ce mot de passe ne sera plus affiché. Copiez-le maintenant puis remettez-le au joueur de manière sécurisée.
        </p>
        <div className="mt-5 rounded-2xl border border-dashed bg-slate-50 p-4">
          <p className="break-all font-mono text-lg font-semibold text-slate-950">{temporaryPassword}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={copyPassword}>
            {copied ? "Mot de passe copié" : "Copier"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
