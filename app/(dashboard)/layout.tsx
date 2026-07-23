import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAppSettings } from "@/lib/settings";
import type { ReactNode } from "react";

export default async function DashboardLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const isAdmin = Boolean(session.user.isAdmin);
  const title = isAdmin ? "Friday Match Wallet · Administration" : "Friday Match Wallet · Mon espace";
  const subtitle = isAdmin
    ? "Pilotez les joueurs, les matchs, les cotisations et l’historique financier."
    : "Consultez votre solde, vos matchs et vos transactions.";
  const settings = await getAppSettings();

  return (
    <AppShell
      title={title}
      subtitle={subtitle}
      isAdmin={isAdmin}
      organizationName={settings.organizationName}
      logoUrl={settings.logoUrl}
      defaultMatchPrice={settings.defaultMatchPrice}
      walletAlertThreshold={settings.walletAlertThreshold}
    >
      {children}
    </AppShell>
  );
}
