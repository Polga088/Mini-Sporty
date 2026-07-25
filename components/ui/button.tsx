import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

export type Variant = "default" | "secondary" | "ghost" | "destructive" | "outline";

const styles: Record<Variant, string> = {
  default: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-soft",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
  ghost: "bg-transparent text-slate-900 hover:bg-slate-100",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  outline: "border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50"
};

export function Button({
  className,
  variant = "default",
  asChild,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; asChild?: boolean; children?: ReactNode }) {
  const buttonClassName = cn(
    "inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
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
    >
      {children}
    </button>
  );
}
