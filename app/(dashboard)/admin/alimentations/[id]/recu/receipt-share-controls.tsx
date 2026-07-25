"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateTopUpReceiptShareLink, revokeTopUpReceiptShareLink } from "@/app/actions/wallet";

export function ReceiptShareControls({
  topUpId,
  activeUntil
}: {
  topUpId: string;
  activeUntil: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [activeUntilState, setActiveUntilState] = useState<string | null>(activeUntil);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createLink() {
    startTransition(() => {
      void generateTopUpReceiptShareLink(topUpId)
        .then((result) => {
          setShareUrl(result.shareUrl);
          setActiveUntilState(new Date(result.expiresAt).toLocaleString("fr-FR"));
          setError(null);
        })
        .catch(() => {
          setError("Impossible de générer le lien de partage.");
        });
    });
  }

  async function revokeLink() {
    startTransition(() => {
      void revokeTopUpReceiptShareLink(topUpId)
        .then(() => {
          setShareUrl(null);
          setActiveUntilState(null);
          setError(null);
        })
        .catch(() => {
          setError("Impossible de révoquer le lien de partage.");
        });
    });
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Partage sécurisé</p>
          <p className="mt-1 text-sm text-slate-700">
            {activeUntilState ? `Lien actif jusqu’au ${activeUntilState}.` : "Aucun lien de partage actif."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={createLink} disabled={isPending}>
            {isPending ? "Génération..." : "Générer un lien"}
          </Button>
          <Button type="button" variant="outline" onClick={revokeLink} disabled={isPending}>
            Révoquer
          </Button>
        </div>
      </div>

      {shareUrl ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border bg-white p-3">
            <p className="break-all text-sm text-slate-700">{shareUrl}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={copyLink}>
              {copied ? "Lien copié" : "Copier le lien"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
