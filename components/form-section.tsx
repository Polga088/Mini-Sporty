import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/section-header";
import type { ReactNode } from "react";

export function FormSection({
  title,
  description,
  children,
  actions,
  className
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("space-y-4", className)}>
      <SectionHeader title={title} description={description} />
      <div className="grid gap-4">{children}</div>
      {actions ? <div className="flex flex-wrap gap-2 border-t pt-4">{actions}</div> : null}
    </Card>
  );
}
