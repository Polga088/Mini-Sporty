import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.isAdmin) redirect("/admin");
  if (session?.user?.id) redirect("/espace");
  redirect("/connexion");
}

