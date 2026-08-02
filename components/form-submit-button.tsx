"use client";

import { useFormStatus } from "react-dom";
import { Button, type Variant } from "@/components/ui/button";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function FormSubmitButton({
  children,
  pendingLabel = "Traitement...",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
  variant?: Variant;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" {...props} disabled={props.disabled || pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
