import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMatch, confirmParticipant, cancelParticipant } from "@/app/actions/matches";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { redirect } from "next/navigation";

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const [matches, users] = await Promise.all([
    prisma.match.findMany({
      orderBy: { matchDate: "asc" },
      include: {
        participants: {
          where: { userId: session.user.id }
        }
      }
    }),
    session.user.isAdmin
      ? prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { wallet: true } })
      : Promise.resolve([])
  ]);

  return (
    <div className="space-y-6">
      {session.user.isAdmin ? (
        <Card>
          <CardTitle>Créer un match</CardTitle>
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
              <Label htmlFor="startTime">Début</Label>
              <Input id="startTime" name="startTime" type="time" required />
            </div>
            <div>
              <Label htmlFor="endTime">Fin</Label>
              <Input id="endTime" name="endTime" type="time" required />
            </div>
            <div>
              <Label htmlFor="location">Lieu</Label>
              <Input id="location" name="location" required />
            </div>
            <div>
              <Label htmlFor="capacity">Capacité</Label>
              <Input id="capacity" name="capacity" type="number" min="1" required />
            </div>
            <div>
              <Label htmlFor="participationFee">Participation</Label>
              <Input id="participationFee" name="participationFee" type="number" step="0.01" defaultValue="10" />
            </div>
            <div>
              <Label htmlFor="bookingReference">Référence réservation</Label>
              <Input id="bookingReference" name="bookingReference" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Publier le match</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Matchs</CardTitle>
        <div className="mt-4 space-y-4">
          {matches.map((match: (typeof matches)[number]) => (
            <div key={match.id} className="rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{match.title}</p>
                  <p className="text-sm text-slate-600">
                    {format(match.matchDate, "EEEE d MMMM yyyy", { locale: fr })} · {match.startTime} - {match.endTime}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{match.location}</p>
                  <p className="mt-1 text-sm text-slate-600">Capacité: {match.capacity} · Prix: {formatDh(match.participationFee)}</p>
                </div>
                <p className="text-sm font-medium">{match.status}</p>
              </div>

              {session.user.isAdmin ? (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {users.map((user: (typeof users)[number]) => (
                    <form key={user.id} action={confirmParticipant} className="flex items-center justify-between rounded-xl border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-slate-600">{formatDh(user.wallet?.balance ?? 0)}</p>
                      </div>
                      <div className="flex gap-2">
                        <input type="hidden" name="matchId" value={match.id} />
                        <input type="hidden" name="userId" value={user.id} />
                        <Button type="submit" variant="secondary">Confirmer</Button>
                      </div>
                    </form>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 text-sm text-slate-600">
                {match.participants.length > 0
                  ? `Votre statut: ${match.participants[0]?.status ?? "INVITED"} · Paiement: ${match.participants[0]?.paymentStatus ?? "PENDING"}`
                  : "Aucune inscription pour le moment"}
              </div>

              {session.user.isAdmin ? (
                <form action={cancelParticipant} className="mt-3 flex gap-2">
                  <input type="hidden" name="matchId" value={match.id} />
                  <input type="hidden" name="userId" value={session.user.id} />
                  <Button type="submit" variant="ghost">Marquer mon inscription annulée</Button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
