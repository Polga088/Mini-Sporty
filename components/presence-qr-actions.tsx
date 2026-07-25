"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink, Printer, Power, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { disableMatchQr, regenerateMatchQr } from "@/app/actions/presence";

export function PresenceQrActions({
  matchId,
  url,
  svg
}: {
  matchId: string;
  url?: string | null;
  svg?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const downloadHref = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {url ? (
          <>
            <Button asChild variant="outline" className="w-full justify-start">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 shrink-0" />
                Ouvrir le QR
              </a>
            </Button>
            <Button type="button" variant="secondary" className="w-full justify-start" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
              {copied ? "Lien copié" : "Copier le lien"}
            </Button>
            <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => window.print()}>
              <Printer className="h-4 w-4 shrink-0" />
              Imprimer
            </Button>
            {downloadHref ? (
              <Button asChild variant="ghost" className="w-full justify-start">
                <a href={downloadHref} download={`qr-${matchId}.svg`}>
                  <Download className="h-4 w-4 shrink-0" />
                  Télécharger le SVG
                </a>
              </Button>
            ) : null}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-slate-600">
            Aucun QR actif pour le moment.
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <form action={regenerateMatchQr} className="contents">
          <input type="hidden" name="matchId" value={matchId} />
          <input type="hidden" name="returnTo" value="/admin/parametres" />
          <ConfirmButton type="submit" className="justify-start" message="Régénérer le QR du prochain match ?">
            <RotateCcw className="h-4 w-4 shrink-0" />
            Régénérer le QR
          </ConfirmButton>
        </form>
        {url ? (
          <form action={disableMatchQr} className="contents">
            <input type="hidden" name="matchId" value={matchId} />
            <input type="hidden" name="returnTo" value="/admin/parametres" />
            <ConfirmButton type="submit" variant="destructive" className="justify-start" message="Désactiver le QR du prochain match ?">
              <Power className="h-4 w-4 shrink-0" />
              Désactiver le QR
            </ConfirmButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}
