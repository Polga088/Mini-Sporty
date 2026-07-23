import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function QuickAction({
  href,
  label,
  description,
  icon,
  tone = "default"
}: {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
  tone?: "default" | "soft";
}) {
  return (
    <Button asChild variant={tone === "soft" ? "ghost" : "secondary"} className="h-auto w-full justify-start rounded-2xl p-4 text-left">
      <Link href={href}>
        <span className={cn("mr-3 rounded-2xl p-2", tone === "soft" ? "bg-white" : "bg-white/10")}>{icon}</span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="block text-xs font-normal opacity-80">{description}</span>
        </span>
      </Link>
    </Button>
  );
}
