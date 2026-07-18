import { Card } from "@/components/ui/card";

export default function LoadingPlayersPage() {
  return (
    <div className="space-y-6">
      <Card>
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </Card>
      <Card>
        <div className="h-6 w-52 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-28 animate-pulse rounded-2xl bg-slate-100" />
      </Card>
      <Card>
        <div className="h-6 w-44 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-80 animate-pulse rounded-2xl bg-slate-100" />
      </Card>
    </div>
  );
}
