"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset, Expense } from "@/lib/farm";
import type { Translate } from "@/lib/i18n";
import { formatMoney } from "@/app/farm/utils";
import { MONTH_NAMES, formatMonthLabel } from "@/app/farm/work-hours/MonthlyChart";

export const NOT_RECORDED = "__not_recorded__";

/* Categorical slots in fixed order, given to people by all-time spend.
   Validated for colour-blind separation on the light surface; two slots sit
   under 3:1 contrast, so the chart always carries a legend, tooltips and a
   table view. "Not recorded" and anyone past the last slot stay neutral. */
const SLOTS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const NEUTRAL = "#a8a29e";

export type Payer = {
  key: string;
  label: string;
  color: string;
  total: number;
  expenses: number;
  assets: number;
  count: number;
};
export type MonthSpend = { month: string; total: number; byPayer: Record<string, number> };
export type SpendSummary = {
  payers: Payer[];
  months: MonthSpend[];
  grandTotal: number;
  expenseTotal: number;
  assetTotal: number;
};

/* "Paid by" is free text, so "EH", "Eh" and " eh " are the same person. */
export function payerKey(name: string | null): string {
  const trimmed = (name ?? "").trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.toLowerCase() : NOT_RECORDED;
}

export function assetMonth(a: Asset): string {
  return (a.purchase_date ?? a.created_at ?? "").slice(0, 7);
}

/* Expenses and asset purchases together, per person and per month. An asset
   with no purchase date counts in the month it was recorded. */
export function summariseSpend(expenses: Expense[], assets: Asset[], t: Translate): SpendSummary {
  const spends = [
    ...expenses.map((e) => ({ amount: Number(e.amount ?? 0), month: (e.expense_date ?? "").slice(0, 7), paidBy: e.vendor_name, isAsset: false })),
    ...assets.map((a) => ({ amount: Number(a.purchase_price ?? 0), month: assetMonth(a), paidBy: a.paid_by, isAsset: true })),
  ];

  const payerMap = new Map<string, { expenses: number; assets: number; count: number; spellings: Map<string, number> }>();
  const monthMap = new Map<string, MonthSpend>();
  let expenseTotal = 0;
  let assetTotal = 0;

  for (const s of spends) {
    const key = payerKey(s.paidBy);
    const spelling = (s.paidBy ?? "").trim().replace(/\s+/g, " ");
    const p = payerMap.get(key) ?? { expenses: 0, assets: 0, count: 0, spellings: new Map<string, number>() };
    if (s.isAsset) p.assets += s.amount;
    else p.expenses += s.amount;
    p.count += 1;
    if (spelling) p.spellings.set(spelling, (p.spellings.get(spelling) ?? 0) + 1);
    payerMap.set(key, p);

    if (s.month) {
      const m = monthMap.get(s.month) ?? { month: s.month, total: 0, byPayer: {} };
      m.total += s.amount;
      m.byPayer[key] = (m.byPayer[key] ?? 0) + s.amount;
      monthMap.set(s.month, m);
    }

    if (s.isAsset) assetTotal += s.amount;
    else expenseTotal += s.amount;
  }

  const sorted = [...payerMap.entries()]
    .map(([key, p]) => ({
      key,
      /* Show the spelling used most often. */
      label: key === NOT_RECORDED ? t("Not recorded") : [...p.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
      total: p.expenses + p.assets,
      expenses: p.expenses,
      assets: p.assets,
      count: p.count,
    }))
    .sort((a, b) => {
      if (a.key === NOT_RECORDED) return 1;
      if (b.key === NOT_RECORDED) return -1;
      return b.total - a.total;
    });

  let slot = 0;
  const payers: Payer[] = sorted.map((p) => ({
    ...p,
    color: p.key === NOT_RECORDED ? NEUTRAL : SLOTS[slot++] ?? NEUTRAL,
  }));

  const months = [...monthMap.values()].sort((a, b) => b.month.localeCompare(a.month));
  return { payers, months, grandTotal: expenseTotal + assetTotal, expenseTotal, assetTotal };
}

/* Every month from the first to the last, oldest first, including empty ones,
   so a gap in the records shows as a gap in the chart. */
function monthRange(months: MonthSpend[]): string[] {
  if (months.length === 0) return [];
  const keys = months.map((m) => m.month).sort();
  const [fy, fm] = keys[0].split("-").map(Number);
  const [ly, lm] = keys[keys.length - 1].split("-").map(Number);
  const out: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ly || (y === ly && m <= lm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function compactMoney(v: number): string {
  if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${+(v / 1_000).toFixed(0)}k`;
  return String(v);
}

function niceScale(value: number): { max: number; step: number } {
  if (value <= 0) return { max: 100_000, step: 50_000 };
  const rough = value / 4;
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const unit = rough / power;
  const step = (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
  return { max: Math.ceil(value / step) * step, step };
}

function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h / 2, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function shortMonth(monthKey: string, t: Translate): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${t(MONTH_NAMES[m - 1]).slice(0, 3)} '${String(y).slice(2)}`;
}

/* Stacked columns, one per month, oldest on the left, one segment per person
   (biggest spender on the baseline). Click a month to open it below. */
export function SpendChart({ summary, selected, onSelect, t }: { summary: SpendSummary; selected: string; onSelect: (m: string) => void; t: Translate }) {
  const [hover, setHover] = useState<string | null>(null);
  const range = useMemo(() => monthRange(summary.months), [summary.months]);
  /* On a narrow screen open on the newest months, at the right-hand end. */
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [range.length]);
  const byMonth = useMemo(() => new Map(summary.months.map((m) => [m.month, m])), [summary.months]);

  const slot = 44;
  const bar = 22;
  const gap = 2;
  const height = 200;
  const padTop = 22;
  const padBottom = 26;
  const padLeft = 44;
  const plotH = height - padTop - padBottom;
  const width = padLeft + range.length * slot + 8;
  const { max, step } = niceScale(Math.max(0, ...summary.months.map((m) => m.total)));
  const y = (v: number) => padTop + plotH - (v / max) * plotH;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(v);
  const hovered = hover ? byMonth.get(hover) ?? { month: hover, total: 0, byPayer: {} } : null;

  return (
    <div className="relative">
      <div ref={scrollRef} className="overflow-x-auto">
        <svg width={width} height={height} className="block" role="img" aria-label={t("Monthly spend by person")}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={padLeft} x2={width} y1={y(v)} y2={y(v)} stroke="#e7e5e4" strokeWidth={1} />
              <text x={padLeft - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#78716c">{compactMoney(v)}</text>
            </g>
          ))}
          {range.map((month, i) => {
            const data = byMonth.get(month);
            const x = padLeft + i * slot + (slot - bar) / 2;
            const isSelected = month === selected;
            const dim = hover !== null && hover !== month;
            const segments = summary.payers
              .map((p) => ({ p, v: data?.byPayer[p.key] ?? 0 }))
              .filter((s) => s.v > 0);
            let running = 0;
            return (
              <g
                key={month}
                className={data ? "cursor-pointer" : undefined}
                opacity={dim ? 0.45 : 1}
                onMouseEnter={() => setHover(month)}
                onMouseLeave={() => setHover(null)}
                onClick={() => data && onSelect(month)}
              >
                <rect x={padLeft + i * slot} y={padTop - 4} width={slot} height={plotH + padBottom + 4} fill={isSelected ? "#f5f5f4" : "transparent"} rx={6} />
                {segments.map((s, idx) => {
                  const bottom = y(running);
                  running += s.v;
                  const top = y(running);
                  const isTop = idx === segments.length - 1;
                  const h = Math.max(0, bottom - top - (idx > 0 ? gap : 0));
                  if (h <= 0) return null;
                  return isTop
                    ? <path key={s.p.key} d={topRounded(x, top, bar, h, 4)} fill={s.p.color} />
                    : <rect key={s.p.key} x={x} y={top} width={bar} height={h} fill={s.p.color} />;
                })}
                {isSelected && data && (
                  <text x={x + bar / 2} y={y(data.total) - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1c1917">{compactMoney(data.total)}</text>
                )}
                <text x={x + bar / 2} y={height - 8} textAnchor="middle" fontSize={10} fontWeight={isSelected ? 700 : 400} fill={isSelected ? "#1c1917" : "#78716c"}>
                  {shortMonth(month, t)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md">
          <div className="font-semibold text-zinc-900">{formatMonthLabel(hovered.month, t)}</div>
          {hovered.total === 0 ? (
            <div className="mt-1 text-zinc-500">{t("Nothing logged")}</div>
          ) : (
            <>
              {summary.payers.filter((p) => hovered.byPayer[p.key]).map((p) => (
                <div key={p.key} className="mt-1 flex items-center gap-1.5 text-zinc-600">
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
                  {p.label} · {formatMoney(hovered.byPayer[p.key])}
                </div>
              ))}
              <div className="mt-1 text-zinc-500">{t("Total")} · {formatMoney(hovered.total)}</div>
            </>
          )}
        </div>
      )}
      <PayerLegend payers={summary.payers} />
    </div>
  );
}

export function PayerLegend({ payers }: { payers: Payer[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
      {payers.map((p) => (
        <span key={p.key} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
          {p.label}
        </span>
      ))}
    </div>
  );
}

/* The same numbers as the chart, as a table: a row per month, a column per
   person, newest month first. */
export function MonthlyTable({ summary, t, onSelect }: { summary: SpendSummary; t: Translate; onSelect?: (m: string) => void }) {
  const { payers, months, grandTotal } = summary;
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200">
      <table className="w-full min-w-max text-sm">
        <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
          <tr>
            <th className="px-4 py-2 font-medium">{t("Month")}</th>
            {payers.map((p) => (
              <th key={p.key} className="px-4 py-2 text-right font-medium">{p.label}</th>
            ))}
            <th className="px-4 py-2 text-right font-medium">{t("Total")}</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr
              key={m.month}
              onClick={onSelect ? () => onSelect(m.month) : undefined}
              className={`border-t border-zinc-100 ${onSelect ? "cursor-pointer hover:bg-zinc-50" : ""}`}
            >
              <td className="whitespace-nowrap px-4 py-2 text-zinc-700">{formatMonthLabel(m.month, t)}</td>
              {payers.map((p) => (
                <td key={p.key} className="whitespace-nowrap px-4 py-2 text-right text-zinc-700">
                  {m.byPayer[p.key] ? formatMoney(m.byPayer[p.key]) : <span className="text-zinc-300">—</span>}
                </td>
              ))}
              <td className="whitespace-nowrap px-4 py-2 text-right font-semibold">{formatMoney(m.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-zinc-200 bg-zinc-50">
          <tr>
            <td className="px-4 py-2 font-semibold">{t("Total")}</td>
            {payers.map((p) => (
              <td key={p.key} className="whitespace-nowrap px-4 py-2 text-right font-semibold">{formatMoney(p.total)}</td>
            ))}
            <td className="whitespace-nowrap px-4 py-2 text-right font-semibold">{formatMoney(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* One card per person: all-time spend, split into expenses and assets. */
export function PayerTotals({ summary, t }: { summary: SpendSummary; t: Translate }) {
  const { payers, grandTotal } = summary;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {payers.map((p) => {
        const share = grandTotal > 0 ? Math.round((p.total / grandTotal) * 100) : 0;
        return (
          <div key={p.key} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-zinc-700">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />
                <span className="truncate">{p.label}</span>
              </span>
              <span className="text-xs text-zinc-400">{share}%</span>
            </div>
            <p className="mt-1 text-lg font-semibold">{formatMoney(p.total)}</p>
            <p className="text-xs text-zinc-500">
              {[
                p.expenses > 0 ? t("Expenses {amount}", { amount: formatMoney(p.expenses) }) : null,
                p.assets > 0 ? t("Assets {amount}", { amount: formatMoney(p.assets) }) : null,
              ].filter(Boolean).join(" · ")}
            </p>
          </div>
        );
      })}
    </div>
  );
}
