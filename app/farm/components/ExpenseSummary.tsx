"use client";

import { useMemo } from "react";
import type { Asset, Expense } from "@/lib/farm";
import { useT } from "@/lib/i18n";
import { formatMoney } from "@/app/farm/utils";
import { formatMonthLabel } from "@/app/farm/work-hours/MonthlyChart";

const NOT_RECORDED = "__not_recorded__";

type Spend = { amount: number; date: string; paidBy: string | null; kind: "expense" | "asset" };
type Payer = { key: string; label: string; total: number; expenses: number; assets: number; count: number };
type MonthRow = { month: string; total: number; byPayer: Record<string, number> };

/* "Paid by" is free text, so "EH", "Eh" and " eh " are the same person.
   Group case-insensitively and show the spelling used most often. */
function payerKey(name: string | null): string {
  const trimmed = (name ?? "").trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.toLowerCase() : NOT_RECORDED;
}

/* Expenses and asset purchases both count as money spent on the farm. An
   asset with no purchase date falls back to when it was recorded. */
function toSpends(expenses: Expense[], assets: Asset[]): Spend[] {
  return [
    ...expenses.map((e) => ({
      amount: Number(e.amount ?? 0),
      date: e.expense_date ?? "",
      paidBy: e.vendor_name,
      kind: "expense" as const,
    })),
    ...assets.map((a) => ({
      amount: Number(a.purchase_price ?? 0),
      date: a.purchase_date ?? a.created_at ?? "",
      paidBy: a.paid_by,
      kind: "asset" as const,
    })),
  ];
}

export function ExpenseSummary({ expenses, assets }: { expenses: Expense[]; assets: Asset[] }) {
  const t = useT();

  const { payers, months, grandTotal, expenseTotal, assetTotal } = useMemo(() => {
    const payerMap = new Map<string, { expenses: number; assets: number; count: number; spellings: Map<string, number> }>();
    const monthMap = new Map<string, MonthRow>();
    let expenseTotal = 0;
    let assetTotal = 0;

    for (const s of toSpends(expenses, assets)) {
      const key = payerKey(s.paidBy);
      const spelling = (s.paidBy ?? "").trim().replace(/\s+/g, " ");

      const p = payerMap.get(key) ?? { expenses: 0, assets: 0, count: 0, spellings: new Map<string, number>() };
      if (s.kind === "expense") p.expenses += s.amount;
      else p.assets += s.amount;
      p.count += 1;
      if (spelling) p.spellings.set(spelling, (p.spellings.get(spelling) ?? 0) + 1);
      payerMap.set(key, p);

      const month = s.date.slice(0, 7);
      if (month) {
        const m = monthMap.get(month) ?? { month, total: 0, byPayer: {} };
        m.total += s.amount;
        m.byPayer[key] = (m.byPayer[key] ?? 0) + s.amount;
        monthMap.set(month, m);
      }

      if (s.kind === "expense") expenseTotal += s.amount;
      else assetTotal += s.amount;
    }

    const payers: Payer[] = [...payerMap.entries()]
      .map(([key, p]) => {
        const label =
          key === NOT_RECORDED
            ? t("Not recorded")
            : [...p.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0];
        return { key, label, total: p.expenses + p.assets, expenses: p.expenses, assets: p.assets, count: p.count };
      })
      .sort((a, b) => {
        if (a.key === NOT_RECORDED) return 1;
        if (b.key === NOT_RECORDED) return -1;
        return b.total - a.total;
      });

    const months = [...monthMap.values()].sort((a, b) => b.month.localeCompare(a.month));

    return { payers, months, grandTotal: expenseTotal + assetTotal, expenseTotal, assetTotal };
  }, [expenses, assets, t]);

  if (expenses.length === 0 && assets.length === 0) return null;

  return (
    <div className="mt-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{t("Total spend by person")}</h3>
        <p className="mt-1 text-xs text-zinc-500">{t("Expenses and asset purchases together.")}</p>
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
                <p className="text-xs text-zinc-500">
                  {t("Expenses {amount}", { amount: formatMoney(p.expenses) })}
                  {p.assets > 0 && <> · {t("Assets {amount}", { amount: formatMoney(p.assets) })}</>}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-100">
                  <div className="h-1.5 rounded-full bg-zinc-800" style={{ width: `${share}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          {t("All time: {amount}", { amount: formatMoney(grandTotal) })}
          {" · "}
          {t("Expenses {amount}", { amount: formatMoney(expenseTotal) })}
          {" · "}
          {t("Assets {amount}", { amount: formatMoney(assetTotal) })}
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
