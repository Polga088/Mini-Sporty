import { Card } from "@/components/ui/card";

export default function LoadingPlayerDetailPage() {
  return (
    <div className="space-y-6">
      <Card>
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </Card>
      <Card>
        <div className="h-6 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-64 animate-pulse rounded-2xl bg-slate-100" />
      </Card>
      <Card>
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-80 animate-pulse rounded-2xl bg-slate-100" />
      </Card>
    </div>
  );
}
