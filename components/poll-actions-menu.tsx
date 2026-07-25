"use client";

import Link from "next/link";
import { Eye, Pause, Play, Plus, RotateCcw, Trash2, X } from "lucide-react";
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
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" className="w-full min-h-10 justify-start gap-2">
          <Link href={returnHref}>
            <Eye className="h-4 w-4 shrink-0" />
            Voir le sondage
          </Link>
        </Button>
        {status !== "OPEN" ? (
          <form action={openAction}>
            <input type="hidden" name="pollId" value={pollId} />
            <ConfirmButton type="submit" className="w-full min-h-10 justify-start gap-2" message={`Ouvrir ${title} ?`}>
              <Play className="h-4 w-4 shrink-0" />
              Ouvrir le sondage
            </ConfirmButton>
          </form>
        ) : null}
        {status === "OPEN" ? (
          <form action={pauseAction}>
            <input type="hidden" name="pollId" value={pollId} />
            <ConfirmButton type="submit" className="w-full min-h-10 justify-start gap-2" message={`Suspendre ${title} ?`}>
              <Pause className="h-4 w-4 shrink-0" />
              Suspendre le sondage
            </ConfirmButton>
          </form>
        ) : null}
        {status === "OPEN" || status === "PAUSED" ? (
          <form action={closeAction}>
            <input type="hidden" name="pollId" value={pollId} />
            <ConfirmButton type="submit" className="w-full min-h-10 justify-start gap-2" message={`Clôturer ${title} ?`}>
              <X className="h-4 w-4 shrink-0" />
              Clôturer le sondage
            </ConfirmButton>
          </form>
        ) : null}
        {status === "CLOSED" ? (
          <form action={reopenAction}>
            <input type="hidden" name="pollId" value={pollId} />
            <ConfirmButton type="submit" className="w-full min-h-10 justify-start gap-2" message={`Rouvrir ${title} ?`}>
              <RotateCcw className="h-4 w-4 shrink-0" />
              Rouvrir le sondage
            </ConfirmButton>
          </form>
        ) : null}
        <form action={cancelAction}>
          <input type="hidden" name="pollId" value={pollId} />
          <ConfirmButton type="submit" variant="destructive" className="w-full min-h-10 justify-start gap-2" message={`Annuler ${title} ?`}>
            <Trash2 className="h-4 w-4 shrink-0" />
            Annuler le sondage
          </ConfirmButton>
        </form>
        {!hasMatch ? (
          <form action={createMatchAction}>
            <input type="hidden" name="pollId" value={pollId} />
            <ConfirmButton type="submit" className="w-full min-h-10 justify-start gap-2" message={`Créer le match à partir de ${title} ?`}>
              <Plus className="h-4 w-4 shrink-0" />
              Créer le match
            </ConfirmButton>
          </form>
        ) : null}
      </div>
    </ActionMenu>
  );
}
