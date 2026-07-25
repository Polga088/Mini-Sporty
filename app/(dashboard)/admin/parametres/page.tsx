import { auth } from "@/auth";
import { getAppSettings } from "@/lib/settings";
import { NoticeBanner } from "@/components/notice-banner";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSubmitButton } from "@/components/form-submit-button";
import { updateGeneralSettings } from "@/app/actions/settings";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { readLatestBackupInfo } from "@/lib/backup";
import { PresenceQrActions } from "@/components/presence-qr-actions";
import { getOrCreatePresenceQr } from "@/lib/presence-service";
import { MatchStatus } from "@prisma/client";
import { tryBuildPresenceQrSvg } from "@/lib/qr";
import { unstable_noStore as noStore } from "next/cache";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSettingsPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  noStore();
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");

  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);
  const settings = await getAppSettings();
  const latestBackup = await readLatestBackupInfo();
  const nextMatch = await prisma.match.findFirst({
    where: {
      status: { in: [MatchStatus.DRAFT, MatchStatus.OPEN, MatchStatus.FULL, MatchStatus.CONFIRMED] }
    },
    orderBy: { matchDate: "asc" }
  });
  const nextMatchQr = nextMatch ? await getOrCreatePresenceQr(nextMatch.id) : null;
  const qrSvg = nextMatchQr?.url ? await tryBuildPresenceQrSvg(nextMatchQr.url) : null;

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardDescription>Statut PWA</CardDescription>
          <CardTitle className="mt-2 text-3xl">Installable</CardTitle>
          <p className="mt-2 text-sm text-slate-600">Manifest, icônes, bouton d’installation et page hors ligne sont activés.</p>
        </Card>
        <Card>
          <CardDescription>Dernière sauvegarde</CardDescription>
          <CardTitle className="mt-2 text-2xl">{latestBackup ? latestBackup.fileName : "Aucune sauvegarde"}</CardTitle>
          <p className="mt-2 text-sm text-slate-600">
            {latestBackup ? `Créée le ${format(latestBackup.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })}` : "Le script de sauvegarde n’a pas encore été exécuté."}
          </p>
        </Card>
        <Card>
          <CardDescription>Prochain match</CardDescription>
          <CardTitle className="mt-2 text-2xl">{nextMatch ? nextMatch.title : "Aucun match"}</CardTitle>
          <p className="mt-2 text-sm text-slate-600">{nextMatch ? `${format(nextMatch.matchDate, "dd/MM/yyyy", { locale: fr })} · ${nextMatch.location}` : "Aucun match à venir."}</p>
        </Card>
      </section>

      {nextMatch ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>QR du prochain match</CardTitle>
              <CardDescription className="max-w-2xl">
                Les joueurs peuvent confirmer leur présence via ce QR sécurisé. Le token expire automatiquement et le lien public reste canonique.
              </CardDescription>
            </div>
            <Badge variant={nextMatch?.qrDisabledAt ? "danger" : "success"}>{nextMatch?.qrDisabledAt ? "Désactivé" : "Actif"}</Badge>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
            <div className="rounded-3xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lien public</p>
                  <p className="mt-1 text-sm text-slate-600">https://sporty.omjep.ma/presence/&lt;token&gt;</p>
                </div>
                <Badge variant={nextMatchQr?.url ? "success" : "danger"}>{nextMatchQr?.url ? "Prêt" : "Inactif"}</Badge>
              </div>

              {nextMatchQr?.url ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    {qrSvg ? (
                      <div className="mx-auto max-w-[280px] overflow-hidden rounded-2xl bg-white p-3 shadow-sm">
                        <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        Le QR code n’a pas pu être généré.
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-dashed bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">URL de présence</p>
                    <p className="mt-2 break-all text-sm text-slate-700">{nextMatchQr.url}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed p-4 text-sm text-slate-600">
                  Le QR est désactivé. Régénérez-le pour afficher le code.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="border-dashed">
                  <CardDescription>Match</CardDescription>
                  <CardTitle className="mt-2 text-xl">{nextMatch?.title}</CardTitle>
                  <p className="mt-2 text-sm text-slate-600">
                    {nextMatch ? `${format(nextMatch.matchDate, "EEEE d MMMM yyyy", { locale: fr })} · ${nextMatch.startTime} - ${nextMatch.endTime}` : ""}
                  </p>
                </Card>
                <Card className="border-dashed">
                  <CardDescription>Expiration QR</CardDescription>
                  <CardTitle className="mt-2 text-xl">
                    {nextMatch?.qrTokenExpiresAt ? format(nextMatch.qrTokenExpiresAt, "dd/MM/yyyy HH:mm", { locale: fr }) : "Aucune"}
                  </CardTitle>
                  <p className="mt-2 text-sm text-slate-600">La synchronisation et la désactivation sont protégées côté serveur.</p>
                </Card>
              </div>

              <PresenceQrActions matchId={nextMatch.id} url={nextMatchQr?.url} svg={qrSvg ?? ""} />
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Paramètres généraux</CardTitle>
        <CardDescription className="max-w-2xl">
          Centralisez le branding, les valeurs par défaut et le message WhatsApp utilisé par les communications de l’application.
        </CardDescription>

        <form action={updateGeneralSettings} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="organizationName">Nom de l’organisation</Label>
            <Input id="organizationName" name="organizationName" defaultValue={settings.organizationName} required />
          </div>
          <div>
            <Label htmlFor="logoUrl">Logo</Label>
            <Input id="logoUrl" name="logoUrl" defaultValue={settings.logoUrl ?? ""} placeholder="https://..." />
          </div>
          <div>
            <Label htmlFor="defaultGround">Terrain par défaut</Label>
            <Input id="defaultGround" name="defaultGround" defaultValue={settings.defaultGround} required />
          </div>
          <div>
            <Label htmlFor="defaultMatchPrice">Prix du match par défaut</Label>
            <Input id="defaultMatchPrice" name="defaultMatchPrice" type="number" step="0.01" min="0" defaultValue={settings.defaultMatchPrice.toString()} required />
          </div>
          <div>
            <Label htmlFor="defaultCapacity">Capacité par défaut</Label>
            <Input id="defaultCapacity" name="defaultCapacity" type="number" min="1" step="1" defaultValue={settings.defaultCapacity} required />
          </div>
          <div>
            <Label htmlFor="walletAlertThreshold">Seuil d’alerte portefeuille</Label>
            <Input id="walletAlertThreshold" name="walletAlertThreshold" type="number" min="0" step="0.01" defaultValue={settings.walletAlertThreshold.toString()} required />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="whatsappTemplate">Modèle de message WhatsApp</Label>
            <textarea
              id="whatsappTemplate"
              name="whatsappTemplate"
              className="min-h-40 w-full rounded-xl border bg-white px-3 py-2 text-sm"
              defaultValue={settings.whatsappTemplate}
              placeholder="Bonjour {name}, ..."
              required
            />
            <p className="mt-2 text-xs text-slate-500">
              Variables disponibles: <code>{`{name}`}</code>, <code>{`{amount}`}</code>, <code>{`{receiptNumber}`}</code>, <code>{`{balance}`}</code>.
            </p>
          </div>
          <div className="md:col-span-2">
            <FormSubmitButton>Enregistrer les paramètres</FormSubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
