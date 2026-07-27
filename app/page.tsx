import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.mustChangePassword) redirect("/mot-de-passe");
  if (session?.user?.isAdmin) redirect("/admin");
  if (session?.user?.id) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/espace");
  }
  redirect("/connexion");
}
