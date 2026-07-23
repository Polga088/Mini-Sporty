import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function Timeline({
  items
}: {
  items: Array<{
    title: string;
    description: string;
    meta?: string;
    tone?: "default" | "success" | "warning" | "danger" | "info";
  }>;
}) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={cn("h-3 w-3 rounded-full", item.tone === "warning" ? "bg-amber-500" : item.tone === "danger" ? "bg-red-500" : item.tone === "info" ? "bg-sky-500" : "bg-emerald-600")} />
            {index < items.length - 1 ? <div className="mt-1 h-full w-px bg-slate-200" /> : null}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-900">{item.title}</p>
              {item.meta ? <Badge variant={item.tone ?? "default"}>{item.meta}</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
