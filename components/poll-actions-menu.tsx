"use client";

import Link from "next/link";
import { ActionMenu } from "@/components/action-menu";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import type { PollStatus } from "@prisma/client";

type ServerAction = (formData: FormData) => Promise<void>;

export function PollActionsMenu({
  pollId,
  title,
  status,
  hasMatch,
  openAction,
  pauseAction,
  closeAction,
  reopenAction,
  cancelAction,
  createMatchAction,
  returnHref
}: {
  pollId: string;
  title: string;
  status: PollStatus;
  hasMatch: boolean;
  openAction: ServerAction;
  pauseAction: ServerAction;
  closeAction: ServerAction;
  reopenAction: ServerAction;
  cancelAction: ServerAction;
  createMatchAction: ServerAction;
  returnHref: string;
}) {
  return (
    <ActionMenu label="Actions">
      <div className="space-y-1">
        <Button asChild variant="ghost" className="w-full justify-start">
          <Link href={returnHref}>Voir le sondage</Link>
        </Button>
        {status !== "OPEN" ? (
          <form action={openAction}>
            <input type="hidden" name="pollId" value={pollId} />
            <ConfirmButton type="submit" className="w-full justify-start" message={`Ouvrir ${title} ?`}>
              Ouvrir
            </ConfirmButton>
          </form>
        ) : null}
        {status === "OPEN" ? (
          <form action={pauseAction}>
            <input type="hidden" name="pollId" value={pollId} />
            <ConfirmButton type="submit" className="w-full justify-start" message={`Suspendre ${title} ?`}>
              Suspendre
            </ConfirmButton>
          </form>
        ) : null}
        {status === "OPEN" || status === "PAUSED" ? (
          <form action={closeAction}>
            <input type="hidden" name="pollId" value={pollId} />
            <ConfirmButton type="submit" className="w-full justify-start" message={`Clôturer ${title} ?`}>
              Clôturer
            </ConfirmButton>
          </form>
        ) : null}
        {status === "CLOSED" ? (
          <form action={reopenAction}>
            <input type="hidden" name="pollId" value={pollId} />
            <ConfirmButton type="submit" className="w-full justify-start" message={`Rouvrir ${title} ?`}>
              Rouvrir
            </ConfirmButton>
          </form>
        ) : null}
        <form action={cancelAction}>
          <input type="hidden" name="pollId" value={pollId} />
          <ConfirmButton type="submit" variant="destructive" className="w-full justify-start" message={`Annuler ${title} ?`}>
            Annuler
          </ConfirmButton>
        </form>
        {!hasMatch ? (
          <form action={createMatchAction}>
            <input type="hidden" name="pollId" value={pollId} />
            <ConfirmButton type="submit" className="w-full justify-start" message={`Créer le match à partir de ${title} ?`}>
              Créer le match
            </ConfirmButton>
          </form>
        ) : null}
      </div>
    </ActionMenu>
  );
}
