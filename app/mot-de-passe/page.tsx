import { auth } from "@/auth";
import { changeMyPassword } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoticeBanner } from "@/components/notice-banner";
import { redirect } from "next/navigation";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PasswordChangePage({
  searchParams
}: {
  searchParams?: Promise<QueryParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);

  if (!session.user.mustChangePassword && session.user.role === "ADMIN") {
    redirect("/admin");
  }

  if (!session.user.mustChangePassword && session.user.role !== "ADMIN") {
    redirect("/espace");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <NoticeBanner success={success} error={error} />

      <Card>
        <CardDescription>Connexion sécurisée</CardDescription>
        <CardTitle className="mt-2 text-3xl">Changer votre mot de passe</CardTitle>
        <p className="mt-2 text-sm text-slate-600">
          Votre mot de passe temporaire doit être remplacé avant d’accéder à Mini Sporty.
        </p>

        <form action={changeMyPassword} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="currentPassword">Mot de passe actuel</Label>
            <Input id="currentPassword" name="currentPassword" type="password" minLength={6} required />
          </div>
          <div>
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <Input id="newPassword" name="newPassword" type="password" minLength={8} required />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required />
          </div>
          <Button type="submit" className="w-full">
            Enregistrer le nouveau mot de passe
          </Button>
        </form>
      </Card>
    </div>
  );
}
