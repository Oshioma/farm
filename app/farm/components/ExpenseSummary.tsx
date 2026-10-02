"use client";

import { useMemo } from "react";
import type { Expense } from "@/lib/farm";
import { useT } from "@/lib/i18n";
import { formatMoney } from "@/app/farm/utils";
import { formatMonthLabel } from "@/app/farm/work-hours/MonthlyChart";

const NOT_RECORDED = "__not_recorded__";

type Payer = { key: string; label: string; total: number; count: number };
type MonthRow = { month: string; total: number; byPayer: Record<string, number> };

/* "Paid by" is free text, so "EH", "Eh" and " eh " are the same person.
   Group case-insensitively and show the spelling used most often. */
function payerKey(name: string | null): string {
  const trimmed = (name ?? "").trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.toLowerCase() : NOT_RECORDED;
}

export function ExpenseSummary({ expenses }: { expenses: Expense[] }) {
  const t = useT();

  const { payers, months, grandTotal } = useMemo(() => {
    const payerMap = new Map<string, { total: number; count: number; spellings: Map<string, number> }>();
    const monthMap = new Map<string, MonthRow>();
    let grandTotal = 0;

    for (const e of expenses) {
      const amount = Number(e.amount ?? 0);
      const key = payerKey(e.vendor_name);
      const spelling = (e.vendor_name ?? "").trim().replace(/\s+/g, " ");

      const p = payerMap.get(key) ?? { total: 0, count: 0, spellings: new Map<string, number>() };
      p.total += amount;
      p.count += 1;
      if (spelling) p.spellings.set(spelling, (p.spellings.get(spelling) ?? 0) + 1);
      payerMap.set(key, p);

      const month = (e.expense_date ?? "").slice(0, 7);
      if (month) {
        const m = monthMap.get(month) ?? { month, total: 0, byPayer: {} };
        m.total += amount;
        m.byPayer[key] = (m.byPayer[key] ?? 0) + amount;
        monthMap.set(month, m);
      }

      grandTotal += amount;
    }

    const payers: Payer[] = [...payerMap.entries()]
      .map(([key, p]) => {
        const label =
          key === NOT_RECORDED
            ? t("Not recorded")
            : [...p.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0];
        return { key, label, total: p.total, count: p.count };
      })
      .sort((a, b) => {
        if (a.key === NOT_RECORDED) return 1;
        if (b.key === NOT_RECORDED) return -1;
        return b.total - a.total;
      });

    const months = [...monthMap.values()].sort((a, b) => b.month.localeCompare(a.month));

    return { payers, months, grandTotal };
  }, [expenses, t]);

  if (expenses.length === 0) return null;

  return (
    <div className="mt-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{t("Total spend by person")}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {payers.map((p) => {
            const share = grandTotal > 0 ? Math.round((p.total / grandTotal) * 100) : 0;
            return (
              <div key={p.key} className="rounded-2xl border border-zinc-200 px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-zinc-700">{p.label}</span>
                  <span className="text-xs text-zinc-400">{share}%</span>
                </div>
                <p className="mt-1 text-lg font-semibold">{formatMoney(p.total)}</p>
                <p className="text-xs text-zinc-500">{t("{n} logged", { n: p.count })}</p>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-100">
                  <div className="h-1.5 rounded-full bg-zinc-800" style={{ width: `${share}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          {t("All time: {amount}", { amount: formatMoney(grandTotal) })}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{t("Monthly spend by person")}</h3>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200">
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
                <tr key={m.month} className="border-t border-zinc-100">
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
      </div>
    </div>
  );
}
