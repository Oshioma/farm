"use client";

import type { Asset, Expense } from "@/lib/farm";
import type { Translate } from "@/lib/i18n";
import { formatMoney } from "@/app/farm/utils";
import { assignColors } from "@/app/farm/components/StackedMonthChart";
import type { MonthBucket } from "@/app/farm/components/StackedMonthChart";

export const NOT_RECORDED = "__not_recorded__";

export type Payer = {
  key: string;
  label: string;
  color: string;
  total: number;
  expenses: number;
  assets: number;
  count: number;
};
export type MonthSpend = MonthBucket;
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
      const m = monthMap.get(s.month) ?? { month: s.month, total: 0, bySeries: {} };
      m.total += s.amount;
      m.bySeries[key] = (m.bySeries[key] ?? 0) + s.amount;
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

  const payers: Payer[] = assignColors(sorted, [NOT_RECORDED]);

  const months = [...monthMap.values()].sort((a, b) => b.month.localeCompare(a.month));
  return { payers, months, grandTotal: expenseTotal + assetTotal, expenseTotal, assetTotal };
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
