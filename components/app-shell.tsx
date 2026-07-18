import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/auth";
import type { ReactNode } from "react";

const baseLinks = [
  { href: "/espace", label: "Vue d’ensemble" },
  { href: "/espace/portefeuilles", label: "Portefeuilles" },
  { href: "/espace/matchs", label: "Matchs" },
  { href: "/espace/cotisations", label: "Cotisations" },
  { href: "/espace/transactions", label: "Historique" }
];

const adminLinks = [
  { href: "/admin", label: "Admin" },
  { href: "/admin/joueurs", label: "Joueurs" },
  { href: "/admin/matchs", label: "Matchs" },
  { href: "/admin/cotisations", label: "Cotisations" },
  { href: "/admin/depenses", label: "Dépenses" },
  { href: "/admin/exports", label: "Exports" }
];

export function AppShell({
  title,
  subtitle,
  isAdmin,
  children
}: {
  title: string;
  subtitle: string;
  isAdmin: boolean;
  children: ReactNode;
}) {
  const links = isAdmin ? [...baseLinks, ...adminLinks] : baseLinks;

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{title}</h1>
              <Badge variant={isAdmin ? "success" : "info"}>{isAdmin ? "ADMIN" : "PLAYER"}</Badge>
            </div>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/connexion" });
          }}>
            <Button type="submit" variant="ghost">Déconnexion</Button>
          </form>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="space-y-4">
          <nav className="glass rounded-2xl border p-3 shadow-soft">
            <ul className="space-y-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-100" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="rounded-2xl border bg-slate-950 p-4 text-white shadow-soft">
            <p className="text-sm text-slate-300">Règle clé</p>
            <p className="mt-2 text-sm">
              Un match confirmé débite automatiquement <strong>10 DH</strong> par joueur confirmé.
            </p>
            <Separator className="my-4 bg-white/10" />
            <p className="text-sm text-slate-300">Alerte solde faible</p>
            <p className="mt-2 text-sm">Notification dès que le portefeuille passe sous 20 DH.</p>
          </div>
        </aside>
        <section className="space-y-6">{children}</section>
      </main>
    </div>
  );
}
