"use client";

import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Variant } from "@/components/ui/button";

type ConfirmButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  message: string;
  children: ReactNode;
  variant?: Variant;
  pendingLabel?: string;
};

export function ConfirmButton({ message, children, onClick, pendingLabel, disabled, ...props }: ConfirmButtonProps) {
  const status = useFormStatus();
  const isPending = status.pending;

  return (
    <Button
      {...props}
      disabled={disabled || isPending}
      onClick={(event) => {
        if (isPending) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (!window.confirm(message)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        onClick?.(event);
      }}
      >
      {isPending ? pendingLabel ?? "Traitement..." : children}
    </Button>
  );
}
