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
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 group-open:bg-slate-100">
        {label}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-2xl border bg-white p-2 shadow-xl">
        {children}
      </div>
    </details>
  );
}
