import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAppSettings } from "@/lib/settings";
import type { ReactNode } from "react";
import { canManageSport } from "@/lib/permissions";

export default async function DashboardLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (session.user.mustChangePassword) redirect("/mot-de-passe");

  const role = session.user.role;
  const isStaff = canManageSport(role);
  const title = isStaff ? "Friday Match Wallet · Administration" : "Friday Match Wallet · Mon espace";
  const subtitle = isStaff
    ? "Pilotez les joueurs, les matchs, les cotisations et l’historique financier."
    : "Consultez votre solde, vos matchs et vos transactions.";
  const settings = await getAppSettings();

  return (
      <AppShell
      title={title}
      subtitle={subtitle}
      role={role}
      organizationName={settings.organizationName}
      logoUrl={settings.logoUrl}
      defaultMatchPrice={settings.defaultMatchPrice}
      walletAlertThreshold={settings.walletAlertThreshold}
    >
      {children}
    </AppShell>
  );
}
