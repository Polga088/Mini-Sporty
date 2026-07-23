"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function FormSubmitButton({
  children,
  pendingLabel = "Traitement...",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" {...props} disabled={props.disabled || pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
