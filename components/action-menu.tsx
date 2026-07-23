"use client";

import type { ReactNode } from "react";

export function ActionMenu({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="group relative">
      <summary className="cursor-pointer list-none rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 group-open:bg-slate-100">
        {label}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border bg-white p-2 shadow-xl">
        {children}
      </div>
    </details>
  );
}
