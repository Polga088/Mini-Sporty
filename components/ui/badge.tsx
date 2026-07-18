import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const variants = {
  default: "bg-slate-100 text-slate-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-800"
};

export function Badge({
  className,
  variant = "default",
  children
}: {
  className?: string;
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", variants[variant], className)}>{children}</span>;
}
