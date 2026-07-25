import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Prisma, TopUpStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import {
  paymentMethodLabel,
  topUpStatusLabel,
  topUpStatusVariant
} from "@/lib/topup-receipt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoticeBanner } from "@/components/notice-banner";
import { ConfirmButton } from "@/components/confirm-button";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { approveTopUp, rejectTopUp } from "@/app/actions/wallet";
import { redirect } from "next/navigation";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeQuery(searchParams?: QueryParams | Promise<QueryParams>) {
  return Promise.resolve(searchParams ?? {}).then((params) => ({
    q: firstValue(params.q)?.trim() ?? "",
    status: firstValue(params.status) ?? "all",
    page: Math.max(1, Number(firstValue(params.page) ?? "1") || 1),
    success: firstValue(params.success),
    error: firstValue(params.error)
  }));
}

function buildHref(base: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return query ? `${base}?${query}` : base;
}

function matchesSearch(
  topUp: {
    amount: { toString(): string };
    note: string | null;
    proofUrl: string | null;
    receiptNumber: string | null;
    paymentMethod: string;
    user: { name: string; email: string; phone: string | null };
  },
  term: string
) {
  if (!term) return true;
  const needle = term.toLowerCase();
  return [
    topUp.user.name,
    topUp.user.email,
    topUp.user.phone ?? "",
    topUp.note ?? "",
    topUp.proofUrl ?? "",
    topUp.receiptNumber ?? "",
    topUp.amount.toString(),
    topUp.paymentMethod
  ].some((value) => value.toLowerCase().includes(needle));
}

function emptyLabel(label: string) {
  return <div className="rounded-xl border border-dashed px-4 py-4 text-sm text-slate-500">{label}</div>;
}

export default async function AdminTopUpsPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");

  const { q, status, page, success, error } = await normalizeQuery(searchParams);

  const rawTopUps = await prisma.walletTopUp.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      reviewedBy: true,
      receiptGeneratedBy: true
    }
  });

  const topUps = rawTopUps.filter((topUp) => {
    const statusMatch = status === "all" ? true : topUp.status.toLowerCase() === status;
    return statusMatch && matchesSearch(topUp, q);
  });

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(topUps.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleTopUps = topUps.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pendingCount = rawTopUps.filter((topUp) => topUp.status === TopUpStatus.PENDING).length;
  const approvedCount = rawTopUps.filter((topUp) => topUp.status === TopUpStatus.APPROVED).length;
  const rejectedCount = rawTopUps.filter((topUp) => topUp.status === TopUpStatus.REJECTED).length;

  const sharedParams = { q, status };

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardDescription>Total</CardDescription>
          <CardTitle className="mt-2 text-3xl">{rawTopUps.length}</CardTitle>
        </Card>
        <Card>
          <CardDescription>En attente</CardDescription>
          <CardTitle className="mt-2 text-3xl">{pendingCount}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Validées</CardDescription>
          <CardTitle className="mt-2 text-3xl">{approvedCount}</CardTitle>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Gestion des alimentations</CardTitle>
            <CardDescription className="max-w-2xl">
              Recherchez une demande, filtrez par statut, puis validez, refusez ou consultez le reçu.
            </CardDescription>
          </div>
          <Button asChild variant="ghost">
            <Link href="/espace/portefeuilles">Voir le flux joueur</Link>
          </Button>
        </div>

        <form method="get" className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label htmlFor="q">Recherche</Label>
            <Input id="q" name="q" defaultValue={q} placeholder="Joueur, email, montant, reçu..." />
          </div>
          <div>
            <Label htmlFor="status">Statut</Label>
            <select id="status" name="status" defaultValue={status} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              <option value="all">Tous</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Validées</option>
              <option value="REJECTED">Refusées</option>
              <option value="CANCELLED">Annulées</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <Button type="submit">Appliquer</Button>
            <Button asChild variant="outline">
              <Link href="/admin/alimentations">Réinitialiser</Link>
            </Button>
          </div>
        </form>
      </Card>

      <section className="grid gap-4">
        {visibleTopUps.length === 0 ? (
          <Card>{emptyLabel("Aucune alimentation ne correspond à ces critères.")}</Card>
        ) : (
          visibleTopUps.map((topUp) => {
            const receiptUrl = `/admin/alimentations/${topUp.id}/recu`;
            const receiptReady = topUp.status === TopUpStatus.APPROVED && Boolean(topUp.receiptNumber);

            return (
              <Card key={topUp.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{topUp.user.name}</CardTitle>
                      <Badge variant={topUpStatusVariant(topUp.status)}>{topUpStatusLabel(topUp.status)}</Badge>
                    </div>
                    <CardDescription>
                      {topUp.user.email} {topUp.user.phone ? `· ${topUp.user.phone}` : ""}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">{formatDh(topUp.amount)}</p>
                    <p className="text-sm text-slate-600">{paymentMethodLabel(topUp.paymentMethod)}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Créée le</p>
                    <p className="mt-1 text-sm font-medium">
                      {format(topUp.createdAt, "dd/MM/yyyy à HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Reçu</p>
                    <p className="mt-1 text-sm font-medium">{topUp.receiptNumber ?? "Non généré"}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Validé par</p>
                    <p className="mt-1 text-sm font-medium">{topUp.reviewedBy?.name ?? "—"}</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Note</p>
                    <p className="mt-1 text-sm font-medium">{topUp.note ?? "Aucune"}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Justificatif</p>
                    {topUp.proofUrl ? (
                      <a href={topUp.proofUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-emerald-700 underline">
                        Ouvrir le justificatif
                      </a>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">Aucun justificatif</p>
                    )}
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Actions</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {topUp.status === TopUpStatus.PENDING ? (
                        <>
                          <form action={approveTopUp}>
                            <input type="hidden" name="topUpId" value={topUp.id} />
                            <ConfirmButton type="submit" message={`Valider l’alimentation de ${topUp.user.name} ?`}>
                              Valider
                            </ConfirmButton>
                          </form>
                          <form action={rejectTopUp}>
                            <input type="hidden" name="topUpId" value={topUp.id} />
                            <ConfirmButton type="submit" variant="destructive" message={`Refuser l’alimentation de ${topUp.user.name} ?`}>
                              Refuser
                            </ConfirmButton>
                          </form>
                        </>
                      ) : receiptReady ? (
                        <Button asChild>
                          <Link href={receiptUrl}>Consulter le reçu</Link>
                        </Button>
                      ) : (
                        <Badge variant={topUpStatusVariant(topUp.status)}>{topUpStatusLabel(topUp.status)}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {receiptReady ? (
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary">
                      <Link href={receiptUrl}>Reçu imprimable</Link>
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })
        )}
      </section>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Page {currentPage} sur {totalPages}
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <Button key={pageNumber} asChild variant={pageNumber === currentPage ? "secondary" : "ghost"}>
                  <Link href={buildHref("/admin/alimentations", { ...sharedParams, page: String(pageNumber) })}>{pageNumber}</Link>
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      <Card>
        <CardTitle>Statistiques rapides</CardTitle>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-slate-600">Refusées</p>
            <p className="mt-1 text-xl font-semibold">{rejectedCount}</p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm text-slate-600">Montant total validé</p>
            <p className="mt-1 text-xl font-semibold">
              {formatDh(
                rawTopUps
                  .filter((topUp) => topUp.status === TopUpStatus.APPROVED)
                  .reduce((total, topUp) => total.add(topUp.amount), new Prisma.Decimal(0))
              )}
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm text-slate-600">Reçus générés</p>
            <p className="mt-1 text-xl font-semibold">
              {rawTopUps.filter((topUp) => Boolean(topUp.receiptNumber)).length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
