import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed bg-white/70 p-6 text-slate-700 shadow-soft">
      <div className={cn("rounded-2xl border bg-slate-50 p-3 text-slate-500", !icon && "hidden")}>{icon}</div>
      <div>
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
