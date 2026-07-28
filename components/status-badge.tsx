import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

const toneToVariant = {
  success: "success",
  warning: "warning",
  error: "danger",
  info: "info",
  neutral: "default"
} as const;

export function StatusBadge({
  label,
  tone = "neutral"
}: {
  label: ReactNode;
  tone?: keyof typeof toneToVariant;
}) {
  return <Badge variant={toneToVariant[tone]}>{label}</Badge>;
}
