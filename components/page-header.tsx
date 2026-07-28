import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  primaryAction,
  secondaryActions,
  eyebrow,
  className
}: {
  title: ReactNode;
  description?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  const hasActions = Boolean(primaryAction || secondaryActions);

  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {hasActions ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          {secondaryActions}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}
