import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function FilterBar({
  children,
  actions,
  className
}: {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 rounded-2xl border bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      <div className="contents">{children}</div>
      {actions ? <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">{actions}</div> : null}
    </div>
  );
}
