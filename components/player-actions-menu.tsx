"use client";

import Link from "next/link";
import { Eye, Power, RotateCcw, Trash2 } from "lucide-react";
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
  const statusLabel = isActive ? "Désactiver le joueur" : "Réactiver le joueur";

  return (
    <ActionMenu label="Actions">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" className="w-full min-h-10 justify-start gap-2">
          <Link href={`/admin/joueurs/${playerId}`}>
            <Eye className="h-4 w-4 shrink-0" />
            Voir la fiche
          </Link>
        </Button>
        <form action={statusAction}>
          <input type="hidden" name="playerId" value={playerId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <ConfirmButton
            type="submit"
            variant={isActive ? "destructive" : "default"}
            className="w-full min-h-10 justify-start gap-2"
            message={isActive ? `Désactiver ${playerName} ?` : `Réactiver ${playerName} ?`}
          >
            <Power className="h-4 w-4 shrink-0" />
            {statusLabel}
          </ConfirmButton>
        </form>
        <form action={resetPasswordAction}>
          <input type="hidden" name="playerId" value={playerId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <ConfirmButton type="submit" variant="outline" className="w-full min-h-10 justify-start gap-2" message={`Réinitialiser le mot de passe de ${playerName} ?`}>
            <RotateCcw className="h-4 w-4 shrink-0" />
            Réinitialiser
          </ConfirmButton>
        </form>
        <form action={deleteAction}>
          <input type="hidden" name="playerId" value={playerId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <ConfirmButton
            type="submit"
            variant="destructive"
            className="w-full min-h-10 justify-start gap-2"
            message={`Supprimer définitivement ${playerName} ? Cette action est irréversible.`}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Supprimer définitivement
          </ConfirmButton>
        </form>
      </div>
    </ActionMenu>
  );
}
