"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

export const ACTION_MENU_OPEN_EVENT = "mini-sporty:action-menu-open";

type MenuPosition = {
  top: number;
  left: number;
  maxHeight: number;
  placement: "top" | "bottom";
};

const MENU_WIDTH = 288;
const VIEWPORT_MARGIN = 12;
const MENU_GAP = 8;

export function computeActionMenuPosition(
  triggerRect: Pick<DOMRect, "top" | "right" | "bottom">,
  menuHeight: number,
  viewportWidth: number,
  viewportHeight: number
): MenuPosition {
  const availableBelow = viewportHeight - triggerRect.bottom - VIEWPORT_MARGIN;
  const availableAbove = triggerRect.top - VIEWPORT_MARGIN;
  const placement = availableBelow >= Math.min(menuHeight, 240) || availableBelow >= availableAbove ? "bottom" : "top";
  const maxHeight = Math.max(160, Math.min(384, placement === "bottom" ? availableBelow - MENU_GAP : availableAbove - MENU_GAP));
  const left = Math.min(
    viewportWidth - MENU_WIDTH - VIEWPORT_MARGIN,
    Math.max(VIEWPORT_MARGIN, triggerRect.right - MENU_WIDTH)
  );
  const top = placement === "bottom"
    ? Math.min(triggerRect.bottom + MENU_GAP, viewportHeight - VIEWPORT_MARGIN - Math.min(menuHeight, maxHeight))
    : Math.max(VIEWPORT_MARGIN, triggerRect.top - MENU_GAP - Math.min(menuHeight, maxHeight));

  return { top, left, maxHeight, placement };
}

export function ActionMenu({
  label,
  children
}: {
  label: string;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const close = useCallback(() => setOpen(false), []);

  const toggleMenu = useCallback(() => {
    if (!open) {
      window.dispatchEvent(new CustomEvent(ACTION_MENU_OPEN_EVENT, { detail: id }));
    }

    setOpen((value) => !value);
  }, [id, open]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const menuHeight = menuRef.current?.offsetHeight ?? 260;
    setPosition(computeActionMenuPosition(
      trigger.getBoundingClientRect(),
      menuHeight,
      window.innerWidth,
      window.innerHeight
    ));
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    function handleOtherMenu(event: Event) {
      if ((event as CustomEvent<string>).detail !== id) close();
    }

    window.addEventListener(ACTION_MENU_OPEN_EVENT, handleOtherMenu);
    return () => window.removeEventListener(ACTION_MENU_OPEN_EVENT, handleOtherMenu);
  }, [close, id]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [close, open, updatePosition]);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  const menuStyle: CSSProperties | undefined = position
    ? {
        left: position.left,
        maxHeight: position.maxHeight,
        top: position.top,
        width: MENU_WIDTH
      }
    : undefined;
  const menuContent = typeof children === "function" ? children(close) : children;

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
        onClick={toggleMenu}
        ref={triggerRef}
        type="button"
      >
        {label}
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition", open && "rotate-180")} />
      </button>
      {typeof document !== "undefined" && open
        ? createPortal(
            <div
              className="fixed z-[100] overflow-y-auto overscroll-contain rounded-2xl border bg-white p-2 shadow-2xl"
              data-placement={position?.placement ?? "bottom"}
              ref={menuRef}
              role="menu"
              style={menuStyle}
            >
              {menuContent}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
