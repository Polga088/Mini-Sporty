import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function PollProgress({
  present,
  waitlist,
  absent,
  capacity
}: {
  present: number;
  waitlist: number;
  absent: number;
  capacity: number;
}) {
  const total = Math.max(1, present + waitlist + absent);
  const presentPercent = (present / Math.max(1, capacity)) * 100;
  const waitlistPercent = (waitlist / total) * 100;
  const absentPercent = (absent / total) * 100;

  return (
    <Card>
      <CardDescription>Progression</CardDescription>
      <CardTitle className="mt-2 text-2xl">
        {present}/{capacity}
      </CardTitle>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
        <div className="flex h-full w-full">
          <div className="bg-emerald-600" style={{ width: `${Math.min(100, presentPercent)}%` }} />
          <div className="bg-amber-500" style={{ width: `${waitlistPercent}%` }} />
          <div className="bg-slate-400" style={{ width: `${absentPercent}%` }} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
        <span>Présents {present}</span>
        <span>Attente {waitlist}</span>
        <span>Absents {absent}</span>
      </div>
    </Card>
  );
}
