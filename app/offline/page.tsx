import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#ffffff_80%)] px-4 py-10">
      <div className="mx-auto flex max-w-xl flex-col items-start gap-6">
        <Card className="w-full">
          <CardTitle>Vous êtes hors ligne</CardTitle>
          <CardDescription className="max-w-lg">
            Mini Sporty n’arrive pas à joindre le serveur pour le moment. Réessayez dès que la connexion revient.
          </CardDescription>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/">Retour à l’accueil</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/connexion">Se reconnecter</Link>
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
