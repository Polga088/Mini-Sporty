"use client";

import Link from "next/link";
import { ActionMenu } from "@/components/action-menu";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";

type ServerAction = (formData: FormData) => Promise<void>;

export function PlayerActionsMenu({
  playerId,
  playerName,
  isActive,
  returnTo,
  disableAction,
  enableAction,
  resetPasswordAction,
  deleteAction
}: {
  playerId: string;
  playerName: string;
  isActive: boolean;
  returnTo: string;
  disableAction: ServerAction;
  enableAction: ServerAction;
  resetPasswordAction: ServerAction;
  deleteAction: ServerAction;
}) {
  const statusAction = isActive ? disableAction : enableAction;
  const statusLabel = isActive ? "Désactiver" : "Réactiver";

  return (
    <ActionMenu label="Actions">
      <div className="space-y-1">
        <Button asChild variant="ghost" className="w-full justify-start">
          <Link href={`/admin/joueurs/${playerId}`}>Voir la fiche</Link>
        </Button>
        <form action={statusAction}>
          <input type="hidden" name="playerId" value={playerId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <ConfirmButton
            type="submit"
            variant={isActive ? "destructive" : "default"}
            className="w-full justify-start"
            message={isActive ? `Désactiver ${playerName} ?` : `Réactiver ${playerName} ?`}
          >
            {statusLabel}
          </ConfirmButton>
        </form>
        <form action={resetPasswordAction}>
          <input type="hidden" name="playerId" value={playerId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <ConfirmButton type="submit" className="w-full justify-start" message={`Réinitialiser le mot de passe de ${playerName} ?`}>
            Réinitialiser le mot de passe
          </ConfirmButton>
        </form>
        <form action={deleteAction}>
          <input type="hidden" name="playerId" value={playerId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <ConfirmButton
            type="submit"
            variant="destructive"
            className="w-full justify-start"
            message={`Supprimer définitivement ${playerName} ? Cette action est irréversible.`}
          >
            Supprimer définitivement
          </ConfirmButton>
        </form>
      </div>
    </ActionMenu>
  );
}
