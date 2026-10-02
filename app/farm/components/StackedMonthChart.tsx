"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Translate } from "@/lib/i18n";
import { formatMoney } from "@/app/farm/utils";
import { MONTH_NAMES, formatMonthLabel } from "@/app/farm/work-hours/MonthlyChart";

/* Money per month, split into series (people, crops, ...), drawn as stacked
   columns or as a table. Used by the Expenses and Sales pages. */

/* Categorical slots in fixed order, given to series by all-time total.
   Validated for colour-blind separation on the light surface; two slots sit
   under 3:1 contrast, so the chart always carries a legend, tooltips and a
   table view. Catch-all series ("Not recorded", "No crop") and anything past
   the last slot stay neutral. */
const SLOTS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
export const NEUTRAL = "#a8a29e";

export type Series = { key: string; label: string; color: string; total: number };
export type MonthBucket = { month: string; total: number; bySeries: Record<string, number> };
export type StackedData = { series: Series[]; months: MonthBucket[]; grandTotal: number };

/* Colours in slot order; series whose key is in `neutral` stay grey. */
export function assignColors<T extends { key: string }>(ordered: T[], neutral: string[] = []): (T & { color: string })[] {
  let slot = 0;
  return ordered.map((s) => ({ ...s, color: neutral.includes(s.key) ? NEUTRAL : SLOTS[slot++] ?? NEUTRAL }));
}

/* Every month from the first to the last, oldest first, including empty ones,
   so a gap in the records shows as a gap in the chart. */
function monthRange(months: MonthBucket[]): string[] {
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

/* Stacked columns, one per month, oldest on the left, one segment per series
   (the biggest on the baseline). Click a month to open it below. */
export function StackedMonthChart({ data, selected, onSelect, t, label }: { data: StackedData; selected: string; onSelect: (m: string) => void; t: Translate; label: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const range = useMemo(() => monthRange(data.months), [data.months]);
  /* On a narrow screen open on the newest months, at the right-hand end. */
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [range.length]);
  const byMonth = useMemo(() => new Map(data.months.map((m) => [m.month, m])), [data.months]);

  const slot = 44;
  const bar = 22;
  const gap = 2;
  const height = 200;
  const padTop = 22;
  const padBottom = 26;
  const padLeft = 44;
  const plotH = height - padTop - padBottom;
  const width = padLeft + range.length * slot + 8;
  const { max, step } = niceScale(Math.max(0, ...data.months.map((m) => m.total)));
  const y = (v: number) => padTop + plotH - (v / max) * plotH;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(v);
  const hovered = hover ? byMonth.get(hover) ?? { month: hover, total: 0, bySeries: {} } : null;

  return (
    <div className="relative">
      <div ref={scrollRef} className="overflow-x-auto">
        <svg width={width} height={height} className="block" role="img" aria-label={label}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={padLeft} x2={width} y1={y(v)} y2={y(v)} stroke="#e7e5e4" strokeWidth={1} />
              <text x={padLeft - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#78716c">{compactMoney(v)}</text>
            </g>
          ))}
          {range.map((month, i) => {
            const bucket = byMonth.get(month);
            const x = padLeft + i * slot + (slot - bar) / 2;
            const isSelected = month === selected;
            const dim = hover !== null && hover !== month;
            const segments = data.series
              .map((p) => ({ p, v: bucket?.bySeries[p.key] ?? 0 }))
              .filter((s) => s.v > 0);
            let running = 0;
            return (
              <g
                key={month}
                className={bucket ? "cursor-pointer" : undefined}
                opacity={dim ? 0.45 : 1}
                onMouseEnter={() => setHover(month)}
                onMouseLeave={() => setHover(null)}
                onClick={() => bucket && onSelect(month)}
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
                {isSelected && bucket && (
                  <text x={x + bar / 2} y={y(bucket.total) - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1c1917">{compactMoney(bucket.total)}</text>
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
              {data.series.filter((p) => hovered.bySeries[p.key]).map((p) => (
                <div key={p.key} className="mt-1 flex items-center gap-1.5 text-zinc-600">
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
                  {p.label} · {formatMoney(hovered.bySeries[p.key])}
                </div>
              ))}
              <div className="mt-1 text-zinc-500">{t("Total")} · {formatMoney(hovered.total)}</div>
            </>
          )}
        </div>
      )}
      <SeriesLegend series={data.series} />
    </div>
  );
}

export function SeriesLegend({ series }: { series: Series[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
      {series.map((p) => (
        <span key={p.key} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
          {p.label}
        </span>
      ))}
    </div>
  );
}

/* The same numbers as the chart, as a table: a row per month, a column per
   series, newest month first. */
export function StackedMonthTable({ data, t, onSelect }: { data: StackedData; t: Translate; onSelect?: (m: string) => void }) {
  const { series, months, grandTotal } = data;
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200">
      <table className="w-full min-w-max text-sm">
        <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
          <tr>
            <th className="px-4 py-2 font-medium">{t("Month")}</th>
            {series.map((p) => (
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
              {series.map((p) => (
                <td key={p.key} className="whitespace-nowrap px-4 py-2 text-right text-zinc-700">
                  {m.bySeries[p.key] ? formatMoney(m.bySeries[p.key]) : <span className="text-zinc-300">—</span>}
                </td>
              ))}
              <td className="whitespace-nowrap px-4 py-2 text-right font-semibold">{formatMoney(m.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-zinc-200 bg-zinc-50">
          <tr>
            <td className="px-4 py-2 font-semibold">{t("Total")}</td>
            {series.map((p) => (
              <td key={p.key} className="whitespace-nowrap px-4 py-2 text-right font-semibold">{formatMoney(p.total)}</td>
            ))}
            <td className="whitespace-nowrap px-4 py-2 text-right font-semibold">{formatMoney(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

