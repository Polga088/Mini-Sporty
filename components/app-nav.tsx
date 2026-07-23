"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, BadgeEuro, Volleyball, ClipboardList, ReceiptText, PiggyBank, Settings, FileDown } from "lucide-react";

const baseLinks = [
  { href: "/espace", label: "Dashboard", icon: LayoutDashboard },
  { href: "/espace/sondages", label: "Sondages", icon: ClipboardList },
  { href: "/espace/matchs", label: "Matchs", icon: Volleyball },
  { href: "/espace/portefeuilles", label: "Portefeuilles", icon: PiggyBank },
  { href: "/espace/transactions", label: "Transactions", icon: ReceiptText }
];

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/sondages", label: "Sondages", icon: ClipboardList },
  { href: "/admin/matchs", label: "Matchs", icon: Volleyball },
  { href: "/admin/alimentations", label: "Portefeuilles", icon: BadgeEuro },
  { href: "/admin/joueurs", label: "Joueurs", icon: Users },
  { href: "/admin/cotisations", label: "Cotisations", icon: ReceiptText },
  { href: "/admin/depenses", label: "Dépenses", icon: PiggyBank },
  { href: "/admin/exports", label: "Exports", icon: FileDown },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings }
];

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? adminLinks : baseLinks;

  return (
    <nav className="space-y-1">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
              active ? "bg-emerald-600 text-white shadow-soft" : "text-slate-700 hover:bg-slate-100"
            )}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
