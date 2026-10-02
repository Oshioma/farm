"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Translate } from "@/lib/i18n";
import { formatMoney } from "@/app/farm/utils";
import { currentMonthKey, formatMonthLabel } from "@/app/farm/work-hours/MonthlyChart";

export const ALL_MONTHS = "all";

/* The month a page should open on: the one in the address (?month=2026-09
   or ?month=all) if there is one, else the latest month with records. */
export function initialMonth(monthsWithData: string[]): string {
  const requested = new URLSearchParams(window.location.search).get("month") ?? "";
  if (requested === ALL_MONTHS || /^\d{4}-\d{2}$/.test(requested)) return requested;
  const sorted = [...monthsWithData].filter(Boolean).sort();
  return sorted[sorted.length - 1] ?? ALL_MONTHS;
}

type Props = {
  /* Monthly totals, any order. */
  months: { month: string; total: number }[];
  grandTotal: number;
  selected: string;
  onSelect: (month: string) => void;
  /* Hold off writing the month into the address until the page has loaded. */
  ready: boolean;
  t: Translate;
};

/* A bar with the open month and its total between previous and next
   arrows, then a row of month pills. Steps through every month with
   records plus the current one; from "All months", previous opens the
   newest. The arrow keys step too, and the open month is kept in the
   address so a refresh or a shared link comes back to it. */
export function MonthNavigator({ months, grandTotal, selected, onSelect, ready, t }: Props) {
  const totals = useMemo(() => new Map(months.map((m) => [m.month, m.total])), [months]);
  const pills = useMemo(() => [...months].sort((a, b) => b.month.localeCompare(a.month)), [months]);

  const steps = useMemo(() => {
    const keys = new Set(months.map((m) => m.month));
    keys.add(currentMonthKey());
    if (selected !== ALL_MONTHS) keys.add(selected);
    return [...keys].sort();
  }, [months, selected]);
  const index = selected === ALL_MONTHS ? -1 : steps.indexOf(selected);
  const prev = selected === ALL_MONTHS ? steps[steps.length - 1] : index > 0 ? steps[index - 1] : null;
  const next = selected !== ALL_MONTHS && index < steps.length - 1 ? steps[index + 1] : null;

  useEffect(() => {
    if (!ready || !selected) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("month") === selected) return;
    url.searchParams.set("month", selected);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [selected, ready]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft" && prev) onSelect(prev);
      if (e.key === "ArrowRight" && next) onSelect(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onSelect]);

  const pillsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    pillsRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [selected]);

  const pill = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"}`;
  const arrow =
    "flex h-11 items-center gap-1 rounded-2xl px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2 rounded-3xl border border-zinc-200 bg-white p-2 shadow-sm">
        <button onClick={() => prev && onSelect(prev)} disabled={!prev} aria-label={t("Previous month")} className={arrow}>
          <span aria-hidden className="text-xl leading-none">‹</span>
          <span className="hidden sm:inline">{prev ? formatMonthLabel(prev, t) : ""}</span>
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-lg font-semibold">
            {selected === ALL_MONTHS ? t("All months") : formatMonthLabel(selected, t)}
          </p>
          <p className="text-xs text-zinc-500">
            {selected === ALL_MONTHS
              ? formatMoney(grandTotal)
              : totals.get(selected)
                ? formatMoney(totals.get(selected) ?? 0)
                : t("Nothing logged")}
          </p>
        </div>
        <button onClick={() => next && onSelect(next)} disabled={!next} aria-label={t("Next month")} className={arrow}>
          <span className="hidden sm:inline">{next ? formatMonthLabel(next, t) : ""}</span>
          <span aria-hidden className="text-xl leading-none">›</span>
        </button>
      </div>

      <div ref={pillsRef} className="mb-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <button onClick={() => onSelect(ALL_MONTHS)} aria-pressed={selected === ALL_MONTHS} className={pill(selected === ALL_MONTHS)}>
          {t("All months")}
        </button>
        {pills.map((m) => {
          const active = m.month === selected;
          return (
            <button key={m.month} onClick={() => onSelect(m.month)} aria-pressed={active} className={pill(active)}>
              {formatMonthLabel(m.month, t)}
              <span className={`ml-2 text-xs ${active ? "text-zinc-300" : "text-zinc-400"}`}>{formatMoney(m.total).replace("TZS ", "")}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
