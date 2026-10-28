"use client";

import { HARVEST_DESTINATIONS, presetSplitFields, splitKgValue } from "@/lib/harvest";
import type { HarvestDestination } from "@/lib/harvest";
import { useT } from "@/lib/i18n";

export type SplitFields = Record<HarvestDestination, string>;

export const blankSplitFields: SplitFields = { EH: "", ORG: "" };

const PRESETS = [
  { label: "All EH", eh: 1 },
  { label: "50 / 50", eh: 0.5 },
  { label: "All ORG", eh: 0 },
];

const tone: Record<HarvestDestination, { bar: string; text: string; box: string }> = {
  EH: { bar: "bg-emerald-600", text: "text-emerald-700", box: "bg-emerald-50 border-emerald-200" },
  ORG: { bar: "bg-blue-600", text: "text-blue-700", box: "bg-blue-50 border-blue-200" },
};

/* Kilos shown to two places without trailing noise. */
function kg(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

type Props = {
  /** The harvest weight being split; null when only counted and not weighed. */
  totalKg: number | null;
  /** True when totalKg was estimated from a count. */
  estimated?: boolean;
  value: SplitFields;
  onChange: (next: SplitFields) => void;
};

/**
 * Where a harvest went: kilos to EH and to ORG, with quick presets. The two
 * shares may add up to less than the harvest (the rest is "not assigned") but
 * never more.
 */
export function HarvestSplitFields({ totalKg, estimated, value, onChange }: Props) {
  const t = useT();
  const total = totalKg && totalKg > 0 ? totalKg : 0;
  const shares = HARVEST_DESTINATIONS.map((d) => ({ ...d, kg: splitKgValue(value[d.key]) }));
  const assigned = shares.reduce((sum, s) => sum + s.kg, 0);
  const over = total > 0 && assigned > total + 0.0005;
  const unassigned = Math.max(0, total - assigned);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{t("Where did it go?")}</span>
        {total > 0 && (
          <span className="text-xs text-zinc-500">
            {t("of {kg} kg", { kg: `${estimated ? "≈ " : ""}${kg(total)}` })}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const preset = presetSplitFields(total, p.eh);
            const active = preset.EH === value.EH.trim() && preset.ORG === value.ORG.trim();
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange(preset)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {t(p.label)}
              </button>
            );
          })}
          {(value.EH.trim() || value.ORG.trim()) && (
            <button
              type="button"
              onClick={() => onChange(blankSplitFields)}
              className="rounded-full px-3 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
            >
              {t("Clear")}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {shares.map((s) => (
          <label key={s.key} className={`block rounded-2xl border p-3 ${tone[s.key].box}`}>
            <span className={`mb-1 block text-sm font-semibold ${tone[s.key].text}`}>{t(s.label)}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={value[s.key]}
                onChange={(e) => onChange({ ...value, [s.key]: e.target.value })}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-zinc-900"
                placeholder="0"
                aria-label={t("Kilos to {dest}", { dest: s.label })}
              />
              <span className="text-sm text-zinc-500">{t("kg")}</span>
            </div>
            {total > 0 && s.kg > 0 && (
              <span className="mt-1 block text-xs text-zinc-500">{Math.round((s.kg / total) * 100)}%</span>
            )}
          </label>
        ))}
      </div>

      {total > 0 && (
        <div className="flex h-2 overflow-hidden rounded-full bg-zinc-200">
          {shares.map((s) => (
            <div key={s.key} className={tone[s.key].bar} style={{ width: `${Math.min(100, (s.kg / total) * 100)}%` }} />
          ))}
        </div>
      )}

      {over ? (
        <p className="text-xs font-medium text-red-700">
          {t("EH and ORG add up to {assigned} kg, more than the {total} kg harvested.", {
            assigned: kg(assigned),
            total: kg(total),
          })}
        </p>
      ) : total > 0 && unassigned > 0.0005 && assigned > 0 ? (
        <p className="text-xs text-zinc-500">{t("{kg} kg not assigned", { kg: kg(unassigned) })}</p>
      ) : null}
    </div>
  );
}

/* True when the shares add up to more than the harvest. */
export function splitIsOver(totalKg: number | null, value: SplitFields): boolean {
  if (!totalKg || totalKg <= 0) return false;
  return splitKgValue(value.EH) + splitKgValue(value.ORG) > totalKg + 0.0005;
}
