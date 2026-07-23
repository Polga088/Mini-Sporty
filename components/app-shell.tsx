import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { formatDh } from "@/lib/money";
import { Prisma, Role } from "@prisma/client";
import Image from "next/image";
import type { ReactNode } from "react";
import { roleLabel } from "@/lib/permissions";

export function AppShell({
  title,
  subtitle,
  role,
  organizationName,
  logoUrl,
  defaultMatchPrice,
  walletAlertThreshold,
  children
}: {
  title: string;
  subtitle: string;
  role?: Role | null;
  organizationName: string;
  logoUrl?: string | null;
  defaultMatchPrice: Prisma.Decimal | number | string;
  walletAlertThreshold: Prisma.Decimal | number | string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#ffffff_70%)]">
      <header className="border-b border-white/50 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-soft">
              {logoUrl ? (
                <Image src={logoUrl} alt={organizationName} width={48} height={48} className="h-full w-full object-cover" />
              ) : (
                organizationName.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
                <Badge variant={role === "ADMIN" ? "success" : role === "CAPTAIN" ? "info" : "default"}>{roleLabel(role)}</Badge>
              </div>
              <p className="text-sm text-slate-600">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="hidden text-right text-sm text-slate-600 md:block">{organizationName}</p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/connexion" });
              }}
            >
              <Button type="submit" variant="ghost">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <nav className="rounded-3xl border border-white/70 bg-white/75 p-3 shadow-soft backdrop-blur">
            <AppNav role={role} />
          </nav>
          <div className="rounded-3xl border border-slate-900 bg-slate-950 p-4 text-white shadow-soft">
            <p className="text-sm text-slate-300">Règle clé</p>
            <p className="mt-2 text-sm">
              Un match confirmé débite automatiquement <strong>{formatDh(defaultMatchPrice)}</strong> par joueur confirmé.
            </p>
            <Separator className="my-4 bg-white/10" />
            <p className="text-sm text-slate-300">Alerte solde faible</p>
            <p className="mt-2 text-sm">Notification dès que le portefeuille passe sous {formatDh(walletAlertThreshold)}.</p>
          </div>
        </aside>
        <section className="space-y-6">{children}</section>
      </main>
    </div>
  );
}
