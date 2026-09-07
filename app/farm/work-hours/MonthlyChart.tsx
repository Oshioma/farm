"use client";

import { useMemo, useState } from "react";
import type { WorkHoursMonth } from "@/lib/farm";
import type { Translate } from "@/lib/i18n";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatMonthLabel(monthKey: string, t: Translate): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${t(MONTH_NAMES[m - 1])} ${y}`;
}

function shortMonthLabel(monthKey: string, t: Translate): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${t(MONTH_NAMES[m - 1]).slice(0, 3)} '${String(y).slice(2)}`;
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function fmtHours(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/* A clean tick step (1, 2 or 5 times a power of ten) giving about four
   ticks, and the axis maximum rounded up to a multiple of it. */
function niceScale(value: number): { max: number; step: number } {
  if (value <= 0) return { max: 10, step: 5 };
  const rough = value / 4;
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const unit = rough / power;
  const step = (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
  return { max: Math.ceil(value / step) * step, step };
}

/* A rectangle rounded only at its top corners: the data end of a column,
   square where it meets the baseline or the segment beneath. */
function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h / 2, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

const OPERATIONAL = "#059669"; /* emerald-600 */
const MANAGER = "#2563eb"; /* blue-600 */

/* Stacked columns, one per month, oldest on the left. Operational hours sit
   on the baseline with manager hours on top. The selected month is labelled
   with its total; every other value lives in the hover tooltip and the tabs. */
export function MonthlyChart({ months, selected, onSelect, t }: { months: WorkHoursMonth[]; selected: string; onSelect: (m: string) => void; t: Translate }) {
  const [hover, setHover] = useState<string | null>(null);
  const ordered = useMemo(() => [...months].sort((a, b) => a.month.localeCompare(b.month)), [months]);
  const slot = 44;
  const bar = 22;
  const gap = 2;
  const height = 180;
  const padTop = 22;
  const padBottom = 26;
  const padLeft = 40;
  const plotH = height - padTop - padBottom;
  const width = padLeft + ordered.length * slot + 8;
  const { max, step } = niceScale(Math.max(0, ...ordered.map((m) => m.total)));
  const y = (v: number) => padTop + plotH - (v / max) * plotH;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(v);
  const hovered = ordered.find((m) => m.month === hover);

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block" role="img" aria-label={t("Hours by month")}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={padLeft} x2={width} y1={y(v)} y2={y(v)} stroke="#e7e5e4" strokeWidth={1} />
              <text x={padLeft - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#78716c">{fmtHours(v)}</text>
            </g>
          ))}
          {ordered.map((m, i) => {
            const x = padLeft + i * slot + (slot - bar) / 2;
            const opTop = y(m.operational);
            const opH = Math.max(0, y(0) - opTop);
            const mgTop = y(m.total);
            const mgH = Math.max(0, opTop - mgTop - (m.operational > 0 && m.manager > 0 ? gap : 0));
            const isSelected = m.month === selected;
            const dim = hover !== null && hover !== m.month;
            return (
              <g
                key={m.month}
                className="cursor-pointer"
                opacity={dim ? 0.45 : 1}
                onMouseEnter={() => setHover(m.month)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(m.month)}
              >
                <rect x={padLeft + i * slot} y={padTop - 4} width={slot} height={plotH + padBottom + 4} fill={isSelected ? "#f5f5f4" : "transparent"} rx={6} />
                {opH > 0 && (m.manager > 0
                  ? <rect x={x} y={opTop} width={bar} height={opH} fill={OPERATIONAL} />
                  : <path d={topRounded(x, opTop, bar, opH, 4)} fill={OPERATIONAL} />)}
                {mgH > 0 && <path d={topRounded(x, mgTop, bar, mgH, 4)} fill={MANAGER} />}
                {isSelected && m.total > 0 && (
                  <text x={x + bar / 2} y={mgTop - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1c1917">{fmtHours(m.total)}</text>
                )}
                <text x={x + bar / 2} y={height - 8} textAnchor="middle" fontSize={10} fontWeight={isSelected ? 700 : 400} fill={isSelected ? "#1c1917" : "#78716c"}>
                  {shortMonthLabel(m.month, t)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md">
          <div className="font-semibold text-zinc-900">{formatMonthLabel(hovered.month, t)}</div>
          <div className="mt-1 flex items-center gap-1.5 text-zinc-600"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: OPERATIONAL }} />{t("Operational")} · {t("{n} h", { n: fmtHours(hovered.operational) })}</div>
          <div className="flex items-center gap-1.5 text-zinc-600"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: MANAGER }} />{t("Manager")} · {t("{n} h", { n: fmtHours(hovered.manager) })}</div>
          <div className="mt-1 text-zinc-500">{t("Total")} · {t("{n} h", { n: fmtHours(hovered.total) })} · {t("{n} entries", { n: hovered.entries })}</div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: OPERATIONAL }} />{t("Operational")}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: MANAGER }} />{t("Manager")}</span>
      </div>
    </div>
  );
}
