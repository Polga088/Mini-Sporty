import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

export type Variant = "default" | "secondary" | "ghost" | "destructive";

const styles: Record<Variant, string> = {
  default: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-soft",
  secondary: "bg-slate-900 text-white hover:bg-slate-800",
  ghost: "bg-transparent hover:bg-slate-100 text-slate-900",
  destructive: "bg-red-600 text-white hover:bg-red-700"
};

export function Button({
  className,
  variant = "default",
  asChild,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; asChild?: boolean; children?: ReactNode }) {
  const buttonClassName = cn(
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none",
    styles[variant],
    className
  );

  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<{ className?: string }>, {
      className: cn(buttonClassName, (children.props as { className?: string }).className)
    });
  }

  return (
    <button
      className={buttonClassName}
      {...props}
    />
  );
}
