import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function ProgressCard({
  label,
  value,
  percent,
  help
}: {
  label: string;
  value: string;
  percent: number;
  help?: string;
}) {
  return (
    <Card>
      <CardDescription>{label}</CardDescription>
      <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
      <div className="mt-3 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-emerald-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      {help ? <p className="mt-2 text-xs text-slate-500">{help}</p> : null}
    </Card>
  );
}
