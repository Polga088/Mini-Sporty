import { auth } from "@/auth";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSubmitButton } from "@/components/form-submit-button";
import { NoticeBanner } from "@/components/notice-banner";
import { createPoll } from "@/app/actions/polls";
import { getAppSettings } from "@/lib/settings";
import { redirect } from "next/navigation";

export default async function NewPollPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!session.user.isAdmin) redirect("/espace");
  const settings = await getAppSettings();

  return (
    <div className="space-y-6">
      <NoticeBanner />

      <Card>
        <CardTitle>Nouveau sondage</CardTitle>
        <CardDescription className="max-w-2xl">
          Renseignez les détails du match proposé, la capacité et le comportement des réponses.
        </CardDescription>

        <form action={createPoll} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input id="title" name="title" required />
          </div>
          <div>
            <Label htmlFor="matchTitle">Titre du match</Label>
            <Input id="matchTitle" name="matchTitle" required />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="Facultatif" />
          </div>
          <div>
            <Label htmlFor="matchDate">Date du match</Label>
            <Input id="matchDate" name="matchDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="location">Terrain</Label>
            <Input id="location" name="location" defaultValue={settings.defaultGround} required />
          </div>
          <div>
            <Label htmlFor="startTime">Heure début</Label>
            <Input id="startTime" name="startTime" type="time" required />
          </div>
          <div>
            <Label htmlFor="endTime">Heure fin</Label>
            <Input id="endTime" name="endTime" type="time" required />
          </div>
          <div>
            <Label htmlFor="capacity">Capacité</Label>
            <Input id="capacity" name="capacity" type="number" min="1" step="1" defaultValue={settings.defaultCapacity} required />
          </div>
          <div>
            <Label htmlFor="matchAmount">Montant du match</Label>
            <Input id="matchAmount" name="matchAmount" type="number" min="0" step="0.01" defaultValue={settings.defaultMatchPrice.toString()} />
          </div>
          <div>
            <Label htmlFor="opensAt">Ouverture</Label>
            <Input id="opensAt" name="opensAt" type="datetime-local" />
          </div>
          <div>
            <Label htmlFor="closesAt">Clôture</Label>
            <Input id="closesAt" name="closesAt" type="datetime-local" />
          </div>
          <div>
            <Label htmlFor="status">Statut initial</Label>
            <select id="status" name="status" className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              <option value="DRAFT">Brouillon</option>
              <option value="OPEN">Ouvert</option>
              <option value="PAUSED">Suspendu</option>
              <option value="CLOSED">Clôturé</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </div>
          <div>
            <Label htmlFor="allowResponseChanges">Modification des réponses</Label>
            <select id="allowResponseChanges" name="allowResponseChanges" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" defaultValue="true">
              <option value="true">Autorisée</option>
              <option value="false">Bloquée</option>
            </select>
          </div>
          <div>
            <Label htmlFor="manualControl">Contrôle manuel</Label>
            <select id="manualControl" name="manualControl" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" defaultValue="false">
              <option value="false">Automatique</option>
              <option value="true">Manuel total</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <FormSubmitButton>Créer le sondage</FormSubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
