import { auth } from "@/auth";
import { createMatch } from "@/app/actions/matches";
import { NoticeBanner } from "@/components/notice-banner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MatchStatus } from "@prisma/client";
import { getAppSettings } from "@/lib/settings";
import { redirect } from "next/navigation";

type QueryParams = Record<string, string | string[] | undefined>;

const editableStatuses = [MatchStatus.DRAFT, MatchStatus.OPEN, MatchStatus.FULL, MatchStatus.CONFIRMED, MatchStatus.COMPLETED] as const;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function matchStatusLabel(status: MatchStatus) {
  switch (status) {
    case MatchStatus.DRAFT:
      return "Brouillon";
    case MatchStatus.OPEN:
      return "Ouvert";
    case MatchStatus.FULL:
      return "Complet";
    case MatchStatus.CONFIRMED:
      return "Confirmé";
    case MatchStatus.COMPLETED:
      return "Terminé";
    case MatchStatus.CANCELLED:
      return "Annulé";
  }
}

export default async function NewMatchPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!session.user.isAdmin) redirect("/espace");

  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);
  const settings = await getAppSettings();

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <Card>
        <CardTitle>Nouveau match</CardTitle>
          <CardDescription className="max-w-2xl">
            Créez un match du vendredi avec les valeurs par défaut de l’organisation.
          </CardDescription>
        <form action={createMatch} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input id="title" name="title" required />
          </div>
          <div>
            <Label htmlFor="matchDate">Date</Label>
            <Input id="matchDate" name="matchDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="startTime">Heure de début</Label>
            <Input id="startTime" name="startTime" type="time" required />
          </div>
          <div>
            <Label htmlFor="endTime">Heure de fin</Label>
            <Input id="endTime" name="endTime" type="time" required />
          </div>
          <div>
            <Label htmlFor="location">Terrain</Label>
            <Input id="location" name="location" defaultValue={settings.defaultGround} required />
          </div>
          <div>
            <Label htmlFor="bookingReference">Référence Rabat Animation</Label>
            <Input id="bookingReference" name="bookingReference" placeholder="Facultatif" />
          </div>
          <div>
            <Label htmlFor="capacity">Capacité</Label>
            <Input id="capacity" name="capacity" type="number" min="1" defaultValue={settings.defaultCapacity} required />
          </div>
          <div>
            <Label htmlFor="participationFee">Prix par joueur</Label>
            <Input id="participationFee" name="participationFee" type="number" min="0" step="0.01" defaultValue={settings.defaultMatchPrice.toString()} />
          </div>
          <div>
            <Label htmlFor="cancellationDeadline">Date limite d’annulation</Label>
            <Input id="cancellationDeadline" name="cancellationDeadline" type="date" />
          </div>
          <div>
            <Label htmlFor="status">Statut</Label>
            <select id="status" name="status" defaultValue={MatchStatus.OPEN} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              {editableStatuses.map((status) => (
                <option key={status} value={status}>
                  {matchStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea id="notes" name="notes" className="min-h-32 w-full rounded-xl border bg-white px-3 py-2 text-sm" placeholder="Notes internes" />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button type="submit">Créer le match</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
