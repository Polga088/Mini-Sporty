import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AccountApprovalStatus, Role } from "@prisma/client";
import { Search } from "lucide-react";
import { auth } from "@/auth";
import { NoticeBanner } from "@/components/notice-banner";
import { RegistrationActions } from "@/components/registration-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusLabel(status: AccountApprovalStatus) {
  if (status === AccountApprovalStatus.PENDING) return "En attente";
  if (status === AccountApprovalStatus.APPROVED) return "Approuvée";
  return "Refusée";
}

function statusVariant(status: AccountApprovalStatus): "warning" | "success" | "danger" {
  if (status === AccountApprovalStatus.PENDING) return "warning";
  if (status === AccountApprovalStatus.APPROVED) return "success";
  return "danger";
}

export default async function AdminRegistrationsPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");

  const params: QueryParams = searchParams ? await searchParams : {};
  const q = firstValue(params.q)?.trim().toLowerCase() ?? "";
  const status = firstValue(params.status) ?? AccountApprovalStatus.PENDING;
  const success = firstValue(params.success);
  const error = firstValue(params.error);
  const statusFilter = Object.values(AccountApprovalStatus).includes(status as AccountApprovalStatus)
    ? (status as AccountApprovalStatus)
    : AccountApprovalStatus.PENDING;

  const [pendingCount, registrations] = await Promise.all([
    prisma.user.count({
      where: {
        role: Role.PLAYER,
        approvalStatus: AccountApprovalStatus.PENDING
      }
    }),
    prisma.user.findMany({
      where: {
        role: Role.PLAYER,
        approvalStatus: statusFilter
      },
      orderBy: { requestedAt: "desc" },
      include: {
        approvedBy: { select: { name: true } },
        rejectedBy: { select: { name: true } },
        wallet: { select: { id: true } }
      }
    })
  ]);

  const filtered = registrations.filter((registration) => {
    if (!q) return true;
    return [registration.name, registration.email, registration.phone ?? ""].some((value) => value.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardDescription>Demandes en attente</CardDescription>
          <CardTitle className="mt-2 text-3xl">{pendingCount}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Filtre</CardDescription>
          <CardTitle className="mt-2 text-3xl">{statusLabel(statusFilter)}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Résultats</CardDescription>
          <CardTitle className="mt-2 text-3xl">{filtered.length}</CardTitle>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Inscriptions joueurs</CardTitle>
            <CardDescription>Validez les nouveaux joueurs avant leur première connexion.</CardDescription>
          </div>
          <Badge variant={pendingCount > 0 ? "warning" : "success"}>{pendingCount > 0 ? "À traiter" : "À jour"}</Badge>
        </div>

        <form method="get" className="mt-4 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div>
            <Label htmlFor="q">Recherche</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <Input id="q" name="q" defaultValue={q} placeholder="Nom, email ou téléphone" className="pl-9" autoComplete="off" />
            </div>
          </div>
          <div>
            <Label htmlFor="status">Statut</Label>
            <select id="status" name="status" defaultValue={statusFilter} className="min-h-11 w-full min-w-0 rounded-xl border bg-white px-3 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <option value={AccountApprovalStatus.PENDING}>En attente</option>
              <option value={AccountApprovalStatus.APPROVED}>Approuvées</option>
              <option value={AccountApprovalStatus.REJECTED}>Refusées</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Filtrer</Button>
          </div>
        </form>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-dashed text-center">
          <CardTitle>Aucune demande</CardTitle>
          <CardDescription>Les nouvelles inscriptions apparaîtront ici.</CardDescription>
        </Card>
      ) : (
        <section className="grid gap-4">
          {filtered.map((registration) => (
            <Card key={registration.id} className="overflow-hidden">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl tracking-[-0.03em]">{registration.name}</CardTitle>
                    <Badge variant={statusVariant(registration.approvalStatus)}>{statusLabel(registration.approvalStatus)}</Badge>
                    {registration.wallet ? <Badge variant="info">Wallet créé</Badge> : null}
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="min-w-0">
                      <dt className="font-semibold text-slate-950">Email</dt>
                      <dd className="truncate">{registration.email}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-950">Téléphone</dt>
                      <dd>{registration.phone ?? "Non renseigné"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-950">Demande</dt>
                      <dd>{format(registration.requestedAt ?? registration.createdAt, "dd MMM yyyy · HH:mm", { locale: fr })}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-950">Traitement</dt>
                      <dd>
                        {registration.approvedAt
                          ? `Validée par ${registration.approvedBy?.name ?? "admin"}`
                          : registration.rejectedAt
                            ? `Refusée par ${registration.rejectedBy?.name ?? "admin"}`
                            : "À examiner"}
                      </dd>
                    </div>
                  </dl>
                  {registration.rejectionReason ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-800">Motif : {registration.rejectionReason}</p> : null}
                </div>

                {registration.approvalStatus === AccountApprovalStatus.PENDING ? <RegistrationActions userId={registration.id} /> : null}
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
