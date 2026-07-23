import { cn } from "@/lib/utils";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/80"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50/80"
        : tone === "danger"
          ? "border-red-200 bg-red-50/80"
          : tone === "info"
            ? "border-sky-200 bg-sky-50/80"
            : "border-slate-200 bg-white/80";

  return (
    <Card className={cn("h-full border", toneClass, className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="mt-2 text-3xl">{value}</CardTitle>
          {hint ? <p className="mt-2 text-sm text-slate-600">{hint}</p> : null}
        </div>
        {icon ? <div className="rounded-2xl bg-white/80 p-3 text-slate-700 shadow-soft">{icon}</div> : null}
      </div>
    </Card>
  );
}
