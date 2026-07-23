"use client";

import { useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { cn } from "@/lib/utils";
import type { PollResponseChoice } from "@prisma/client";

type ServerAction = (formData: FormData) => Promise<void>;

type Participant = {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  response: PollResponseChoice;
  isWaitlisted: boolean;
  waitlistOrder: number | null;
};

const columnLabels: Record<"PRESENT" | "WAITLISTED" | "ABSENT", string> = {
  PRESENT: "Présents",
  WAITLISTED: "Liste d’attente",
  ABSENT: "Absents"
};

const columnTones: Record<"PRESENT" | "WAITLISTED" | "ABSENT", string> = {
  PRESENT: "border-emerald-200 bg-emerald-50/70",
  WAITLISTED: "border-amber-200 bg-amber-50/70",
  ABSENT: "border-slate-200 bg-slate-50/70"
};

export function PollBoard({
  pollId,
  participants,
  moveAction,
  removeAction,
  promoteAction
}: {
  pollId: string;
  participants: Participant[];
  moveAction: ServerAction;
  removeAction: ServerAction;
  promoteAction: ServerAction;
}) {
  const moveFormRef = useRef<HTMLFormElement | null>(null);
  const pollInputRef = useRef<HTMLInputElement | null>(null);
  const userInputRef = useRef<HTMLInputElement | null>(null);
  const targetInputRef = useRef<HTMLInputElement | null>(null);

  const grouped = useMemo(() => {
    return {
      PRESENT: participants.filter((participant) => participant.response === "PRESENT" && !participant.isWaitlisted),
      WAITLISTED: participants.filter((participant) => participant.isWaitlisted),
      ABSENT: participants.filter((participant) => participant.response === "ABSENT")
    };
  }, [participants]);

  function submitMove(userId: string, target: "PRESENT" | "WAITLISTED" | "ABSENT") {
    if (!moveFormRef.current || !pollInputRef.current || !userInputRef.current || !targetInputRef.current) return;
    pollInputRef.current.value = pollId;
    userInputRef.current.value = userId;
    targetInputRef.current.value = target;
    moveFormRef.current.requestSubmit();
  }

  return (
    <div className="space-y-4">
      <form ref={moveFormRef} action={moveAction} className="hidden">
        <input ref={pollInputRef} type="hidden" name="pollId" defaultValue={pollId} />
        <input ref={userInputRef} type="hidden" name="userId" />
        <input ref={targetInputRef} type="hidden" name="target" />
      </form>

      <div className="grid gap-4 xl:grid-cols-3">
        {(["PRESENT", "WAITLISTED", "ABSENT"] as const).map((column) => (
          <div
            key={column}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const userId = event.dataTransfer.getData("text/poll-user");
              if (userId) submitMove(userId, column);
            }}
            className={cn("rounded-3xl border p-4 shadow-soft", columnTones[column])}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">{columnLabels[column]}</h3>
              <Badge variant={column === "PRESENT" ? "success" : column === "WAITLISTED" ? "warning" : "default"}>
                {grouped[column].length}
              </Badge>
            </div>
            <div className="mt-4 space-y-3">
              {grouped[column].length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-white/70 px-4 py-6 text-sm text-slate-500">
                  Déposez un joueur ici.
                </div>
              ) : (
                grouped[column].map((participant) => (
                  <article
                    key={participant.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/poll-user", participant.userId);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    className="cursor-grab rounded-2xl border bg-white p-4 shadow-sm active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{participant.user.name}</p>
                        <p className="text-sm text-slate-600">{participant.user.email}</p>
                      </div>
                      <Badge variant={column === "PRESENT" ? "success" : column === "WAITLISTED" ? "warning" : "default"}>
                        {column === "WAITLISTED" && participant.waitlistOrder ? `#${participant.waitlistOrder}` : columnLabels[column]}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" className="justify-start px-3 py-1.5 text-xs" onClick={() => submitMove(participant.userId, "PRESENT")}>
                        Présent
                      </Button>
                      <Button type="button" variant="ghost" className="justify-start px-3 py-1.5 text-xs" onClick={() => submitMove(participant.userId, "WAITLISTED")}>
                        En attente
                      </Button>
                      <Button type="button" variant="ghost" className="justify-start px-3 py-1.5 text-xs" onClick={() => submitMove(participant.userId, "ABSENT")}>
                        Absent
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {participant.isWaitlisted ? (
                        <form action={promoteAction}>
                          <input type="hidden" name="pollId" value={pollId} />
                          <input type="hidden" name="userId" value={participant.userId} />
                          <ConfirmButton type="submit" className="px-3 py-1.5 text-xs" message={`Promouvoir ${participant.user.name} ?`}>
                            Promouvoir
                          </ConfirmButton>
                        </form>
                      ) : null}
                      <form action={removeAction}>
                        <input type="hidden" name="pollId" value={pollId} />
                        <input type="hidden" name="userId" value={participant.userId} />
                        <ConfirmButton type="submit" variant="destructive" className="px-3 py-1.5 text-xs" message={`Retirer ${participant.user.name} du sondage ?`}>
                          Retirer
                        </ConfirmButton>
                      </form>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
