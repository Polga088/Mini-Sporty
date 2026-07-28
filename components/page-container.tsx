import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-4 py-5 sm:px-5 sm:py-6 lg:px-8", className)}
      {...props}
    />
  );
}
