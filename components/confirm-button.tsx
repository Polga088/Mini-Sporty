"use client";

import { Button } from "@/components/ui/button";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Variant } from "@/components/ui/button";

type ConfirmButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  message: string;
  children: ReactNode;
  variant?: Variant;
};

export function ConfirmButton({ message, children, onClick, ...props }: ConfirmButtonProps) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        onClick?.(event);
      }}
    >
      {children}
    </Button>
  );
}
