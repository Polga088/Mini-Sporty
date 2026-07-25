"use client";

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
  const downloadHref = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
  return (
    <div className="flex flex-wrap gap-3">
      {url ? (
        <>
          <Button asChild variant="ghost">
            <a href={url} target="_blank" rel="noreferrer">
              Ouvrir le QR
            </a>
          </Button>
          {downloadHref ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                }}
              >
                Copier le lien
              </Button>
              <Button type="button" variant="ghost" onClick={() => window.print()}>
                Imprimer
              </Button>
              <Button asChild variant="ghost">
                <a href={downloadHref} download={`qr-${matchId}.svg`}>
                  Télécharger
                </a>
              </Button>
            </>
          ) : null}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-slate-600">Aucun QR actif pour le moment.</div>
      )}
      <form action={regenerateMatchQr}>
        <input type="hidden" name="matchId" value={matchId} />
        <input type="hidden" name="returnTo" value="/admin/parametres" />
        <ConfirmButton type="submit" message="Régénérer le QR du prochain match ?">
          Régénérer
        </ConfirmButton>
      </form>
      {url ? (
        <form action={disableMatchQr}>
          <input type="hidden" name="matchId" value={matchId} />
          <input type="hidden" name="returnTo" value="/admin/parametres" />
          <ConfirmButton type="submit" variant="destructive" message="Désactiver le QR du prochain match ?">
            Désactiver
          </ConfirmButton>
        </form>
      ) : null}
    </div>
  );
}
