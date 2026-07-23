import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ActivityFeed({
  title,
  description,
  items,
  emptyLabel = "Aucune activité récente."
}: {
  title: string;
  description?: string;
  items: Array<{
    title: string;
    description: string;
    meta?: string;
    tone?: "default" | "success" | "warning" | "danger" | "info";
  }>;
  emptyLabel?: string;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {description ? <CardDescription className="max-w-2xl">{description}</CardDescription> : null}
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-slate-500">{emptyLabel}</div>
        ) : (
          items.map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-2xl border bg-white/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                </div>
                {item.meta ? <Badge variant={item.tone ?? "default"}>{item.meta}</Badge> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
