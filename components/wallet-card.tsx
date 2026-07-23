import { Wallet } from "lucide-react";
import { Prisma } from "@prisma/client";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDh } from "@/lib/money";

export function WalletCard({
  balance,
  threshold,
  nextMatch,
  alertCount
}: {
  balance: Prisma.Decimal | number | string;
  threshold: Prisma.Decimal | number | string;
  nextMatch?: string;
  alertCount?: number;
}) {
  const low = Number(balance) < Number(threshold);

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardDescription>Portefeuille</CardDescription>
          <CardTitle className="mt-2 text-4xl">{formatDh(balance)}</CardTitle>
        </div>
        <div className="rounded-2xl bg-white p-3 text-emerald-700 shadow-soft">
          <Wallet className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant={low ? "warning" : "success"}>{low ? "Solde faible" : "Solde sain"}</Badge>
        {typeof alertCount === "number" ? <Badge variant="info">{alertCount} alerte(s)</Badge> : null}
      </div>
      {nextMatch ? <p className="mt-3 text-sm text-slate-700">{nextMatch}</p> : null}
    </Card>
  );
}
