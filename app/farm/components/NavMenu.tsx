"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";

export type NavMenuItem = {
  key: string;
  label: string;
  /** A link item navigates; an action item calls onSelect. */
  href?: string;
  onSelect?: () => void;
  active?: boolean;
  /** Draw a rule above this item. */
  dividerBefore?: boolean;
  /** Non-interactive caption, e.g. the signed-in email. */
  heading?: boolean;
  tone?: "default" | "danger";
};

type Props = {
  label: React.ReactNode;
  items: NavMenuItem[];
  /** Highlights the trigger, e.g. when the current page lives in this menu. */
  active?: boolean;
  align?: "left" | "right";
  variant?: "pill" | "primary" | "nav";
  ariaLabel?: string;
  className?: string;
};

/* A small accessible dropdown in the app's pill style. Opens on click, closes
   on outside click, Escape, or after choosing an item; arrow keys move between
   items. Used for the grouped desktop navigation, the farm switcher, the
   account menu and the "+ Add" quick actions. */
export function NavMenu({ label, items, active = false, align = "left", variant = "pill", ariaLabel, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent | TouchEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        (root.current?.querySelector("button[aria-haspopup]") as HTMLButtonElement | null)?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function focusItem(offset: number, from?: HTMLElement) {
    const nodes = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (!nodes.length) return;
    const index = from ? nodes.indexOf(from) : -1;
    const next = offset === Number.POSITIVE_INFINITY ? nodes.length - 1 : offset === Number.NEGATIVE_INFINITY ? 0 : (index + offset + nodes.length) % nodes.length;
    nodes[next]?.focus();
  }

  function onMenuKey(event: React.KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (event.key === "ArrowDown") { event.preventDefault(); focusItem(1, target); }
    if (event.key === "ArrowUp") { event.preventDefault(); focusItem(-1, target); }
    if (event.key === "Home") { event.preventDefault(); focusItem(Number.NEGATIVE_INFINITY); }
    if (event.key === "End") { event.preventDefault(); focusItem(Number.POSITIVE_INFINITY); }
  }

  const trigger = {
    pill: "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100",
    primary: "rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800",
    nav: active
      ? "rounded-full bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-white"
      : "rounded-full border border-zinc-100 px-3.5 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900",
  }[variant];

  const itemClass = (item: NavMenuItem) =>
    "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition focus:outline-none focus-visible:bg-zinc-100 " +
    (item.tone === "danger" ? "text-red-600 hover:bg-red-50" : item.active ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-700 hover:bg-zinc-100");

  return (
    <div ref={root} className={"relative " + className}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); window.setTimeout(() => focusItem(Number.NEGATIVE_INFINITY), 0); }
        }}
        className={"inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 " + trigger}
      >
        {label}
        <ChevronDown className={"h-4 w-4 transition " + (open ? "rotate-180" : "")} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          onKeyDown={onMenuKey}
          className={"absolute z-40 mt-2 min-w-[13rem] overflow-hidden rounded-2xl border border-zinc-200 bg-white py-1.5 shadow-lg " + (align === "right" ? "right-0" : "left-0")}
        >
          {items.map((item) => {
            const rule = item.dividerBefore ? <div className="my-1.5 border-t border-zinc-100" /> : null;
            if (item.heading) {
              return (
                <div key={item.key}>
                  {rule}
                  <div className="px-4 py-2 text-xs text-zinc-500">{item.label}</div>
                </div>
              );
            }
            const content = (
              <>
                <span className="truncate">{item.label}</span>
                {item.active && <Check className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />}
              </>
            );
            return (
              <div key={item.key}>
                {rule}
                {item.href ? (
                  <Link role="menuitem" href={item.href} onClick={() => setOpen(false)} className={itemClass(item)} aria-current={item.active ? "page" : undefined}>
                    {content}
                  </Link>
                ) : (
                  <button role="menuitem" type="button" onClick={() => { setOpen(false); item.onSelect?.(); }} className={itemClass(item)}>
                    {content}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
