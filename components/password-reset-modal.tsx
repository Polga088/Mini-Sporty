"use client";

import { useState } from "react";
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
  const [closing, setClosing] = useState(false);

  async function copyPassword() {
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
  }

  async function closeAfterConfirmation() {
    setClosing(true);
    await clearPasswordResetFlash();
    setOpen(false);
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      role="presentation"
    >
      <div
        aria-describedby="password-reset-warning"
        aria-labelledby="password-reset-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-3xl border bg-white p-6 shadow-2xl"
        role="dialog"
        tabIndex={-1}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">Mot de passe temporaire</p>
        <h2 id="password-reset-title" className="mt-2 text-2xl font-semibold text-slate-950">{playerName}</h2>
        <p id="password-reset-warning" className="mt-3 text-sm font-medium text-red-700">
          Ce mot de passe ne sera plus affiché après la fermeture.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Copiez-le maintenant puis remettez-le au joueur de manière sécurisée.
        </p>
        <div className="mt-5 rounded-2xl border border-dashed bg-slate-50 p-4">
          <p className="break-all font-mono text-lg font-semibold text-slate-950">{temporaryPassword}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={copyPassword}>
            {copied ? "Copié" : "Copier"}
          </Button>
          <Button type="button" variant="outline" onClick={closeAfterConfirmation} disabled={closing}>
            {closing ? "Fermeture..." : "J’ai copié, fermer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
