import type { CollectedOrder, Sale } from "@/lib/farm";
import type { Translate } from "@/lib/i18n";
import { assignColors } from "@/app/farm/components/StackedMonthChart";
import type { MonthBucket, Series } from "@/app/farm/components/StackedMonthChart";

export const NO_CROP = "__no_crop__";
export const NO_BUYER = "__no_buyer__";

/* One line of money in: a sale logged by hand, or a shop order the customer
   collected. Orders are read-only here; they're managed on the Orders page. */
export type IncomeRow = {
  id: string;
  source: "sale" | "order";
  date: string;
  cropKey: string;
  cropLabel: string;
  buyerKey: string;
  buyerLabel: string;
  quantityKg: number | null;
  pricePerKg: number | null;
  total: number | null;
  notes: string | null;
  reference: string | null;
  sale?: Sale;
};

function first<T>(v: T[] | T | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function nameKey(name: string | null | undefined, empty: string): string {
  const trimmed = (name ?? "").trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.toLowerCase() : empty;
}

export function toIncomeRows(sales: Sale[], orders: CollectedOrder[], t: Translate): IncomeRow[] {
  const fromSales: IncomeRow[] = sales.map((s) => {
    const crop = first(s.crop)?.crop_name ?? null;
    return {
      id: s.id,
      source: "sale",
      date: s.sale_date ?? "",
      cropKey: s.crop_id ?? NO_CROP,
      cropLabel: crop ?? t("No crop"),
      buyerKey: nameKey(s.buyer_name, NO_BUYER),
      buyerLabel: s.buyer_name?.trim() || t("Not recorded"),
      quantityKg: s.quantity_kg,
      pricePerKg: s.price_per_kg,
      total: s.total_amount,
      notes: s.notes,
      reference: null,
      sale: s,
    };
  });
  /* Collected orders count at what was actually handed over and charged,
     falling back to what was reserved. */
  const fromOrders: IncomeRow[] = orders.map((o) => {
    const kg = o.actual_quantity_kg ?? o.quantity_kg;
    const price = o.actual_price_per_kg ?? o.price_per_kg;
    const customer = first(o.customer)?.name ?? null;
    return {
      id: o.id,
      source: "order",
      date: (o.collected_at ?? o.updated_at ?? "").slice(0, 10),
      cropKey: o.crop_id ?? NO_CROP,
      cropLabel: first(o.crop)?.crop_name ?? t("No crop"),
      buyerKey: nameKey(customer, NO_BUYER),
      buyerLabel: customer?.trim() || t("Not recorded"),
      quantityKg: kg,
      pricePerKg: price,
      total: kg != null && price != null ? Math.round(kg * price) : null,
      notes: o.notes,
      reference: o.reservation_reference,
    };
  });
  return [...fromSales, ...fromOrders].sort((a, b) => b.date.localeCompare(a.date));
}

export type IncomeSummary = {
  crops: Series[];
  buyers: { key: string; label: string; total: number; count: number }[];
  months: MonthBucket[];
  grandTotal: number;
  salesTotal: number;
  ordersTotal: number;
};

/* Totals per crop (the chart's series), per buyer and per month. */
export function summariseIncome(rows: IncomeRow[]): IncomeSummary {
  const crops = new Map<string, { label: string; total: number }>();
  const buyers = new Map<string, { label: string; total: number; count: number }>();
  const months = new Map<string, MonthBucket>();
  let salesTotal = 0;
  let ordersTotal = 0;

  for (const r of rows) {
    const amount = Number(r.total ?? 0);
    const c = crops.get(r.cropKey) ?? { label: r.cropLabel, total: 0 };
    c.total += amount;
    crops.set(r.cropKey, c);

    const b = buyers.get(r.buyerKey) ?? { label: r.buyerLabel, total: 0, count: 0 };
    b.total += amount;
    b.count += 1;
    buyers.set(r.buyerKey, b);

    const month = r.date.slice(0, 7);
    if (month) {
      const m = months.get(month) ?? { month, total: 0, bySeries: {} };
      m.total += amount;
      m.bySeries[r.cropKey] = (m.bySeries[r.cropKey] ?? 0) + amount;
      months.set(month, m);
    }

    if (r.source === "sale") salesTotal += amount;
    else ordersTotal += amount;
  }

  const lastFor = (key: string) => (a: { key: string; total: number }, b: { key: string; total: number }) => {
    if (a.key === key) return 1;
    if (b.key === key) return -1;
    return b.total - a.total;
  };

  return {
    crops: assignColors(
      [...crops.entries()].map(([key, c]) => ({ key, ...c })).sort(lastFor(NO_CROP)),
      [NO_CROP]
    ),
    buyers: [...buyers.entries()].map(([key, b]) => ({ key, ...b })).sort(lastFor(NO_BUYER)),
    months: [...months.values()].sort((a, b) => b.month.localeCompare(a.month)),
    grandTotal: salesTotal + ordersTotal,
    salesTotal,
    ordersTotal,
  };
}
