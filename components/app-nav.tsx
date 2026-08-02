"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, BadgeEuro, Volleyball, ClipboardList, ReceiptText, PiggyBank, Settings, FileDown, Bell, ChartColumn, UserPlus } from "lucide-react";
import { Role } from "@prisma/client";
import { canAccessSensitiveAdmin, canManageSport } from "@/lib/permissions";
import { PwaControls } from "@/components/pwa-controls";

const baseLinks = [
  { href: "/espace", label: "Dashboard", icon: LayoutDashboard },
  { href: "/espace/sondages", label: "Sondages", icon: ClipboardList },
  { href: "/espace/matchs", label: "Matchs", icon: Volleyball },
  { href: "/espace/notifications", label: "Notifications", icon: Bell },
  { href: "/espace/portefeuilles", label: "Portefeuilles", icon: PiggyBank },
  { href: "/espace/transactions", label: "Transactions", icon: ReceiptText }
];

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/statistiques", label: "Statistiques", icon: ChartColumn },
  { href: "/admin/sondages", label: "Sondages", icon: ClipboardList },
  { href: "/admin/matchs", label: "Matchs", icon: Volleyball },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/inscriptions", label: "Inscriptions", icon: UserPlus },
  { href: "/admin/alimentations", label: "Portefeuilles", icon: BadgeEuro },
  { href: "/admin/joueurs", label: "Joueurs", icon: Users },
  { href: "/admin/cotisations", label: "Cotisations", icon: ReceiptText },
  { href: "/admin/depenses", label: "Dépenses", icon: PiggyBank },
  { href: "/admin/exports", label: "Exports", icon: FileDown },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings }
];

export function AppNav({ role }: { role?: Role | null }) {
  const pathname = usePathname();
  const links = canManageSport(role)
    ? adminLinks.filter((link) => {
        if (link.href === "/admin/inscriptions" || link.href === "/admin/alimentations" || link.href === "/admin/joueurs" || link.href === "/admin/cotisations" || link.href === "/admin/depenses" || link.href === "/admin/exports" || link.href === "/admin/parametres") {
          return canAccessSensitiveAdmin(role);
        }
        return true;
      })
    : baseLinks;

  return (
    <nav className="space-y-1">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 w-full max-w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 sm:px-4 sm:py-3",
              active ? "bg-emerald-600 text-white shadow-soft" : "text-slate-700 hover:bg-slate-100"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{link.label}</span>
          </Link>
        );
      })}
      <div className="pt-3 md:hidden">
        <PwaControls />
      </div>
    </nav>
  );
}
