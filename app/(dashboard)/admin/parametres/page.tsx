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

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSettingsPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");

  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);
  const settings = await getAppSettings();

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

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
