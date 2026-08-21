"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getFarms,
  getHarvestEta,
  getZones,
  getCrops,
  getCustomers,
  getCustomerOrders,
  seasonMonths,
  harvestSeasonYear,
  harvestMonthKeyFor,
  parseYieldKg,
  orderKg,
  isStandingOrder,
  bedLabel,
} from "@/lib/farm";
import type { Farm, HarvestEtaEntry, Zone, Crop, SeasonMonth, Customer, CustomerOrder } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

/* Same window as the harvest ETA sheet this reads from. */
const SEASON_SPAN = 2;

function fmtKg(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} t`;
  if (kg >= 10) return `${Math.round(kg).toLocaleString()} kg`;
  return `${kg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
}

/** One crop's contribution to a month. */
type Line = {
  id: string;
  crop: string;
  beds: string;
  raw: string;
  kg: number | null;
  isRange: boolean;
  unit: string | null;
};

/** One customer's claim on a month. */
type Claim = {
  id: string;
  customer: string;
  crop: string;
  amount: string;
  kg: number | null;
  standing: boolean;
};

type MonthTotal = {
  month: SeasonMonth;
  expected: Line[];
  actual: Line[];
  expectedKg: number;
  actualKg: number;
  /** Cells with something written that could not be read as a weight. */
  unconverted: Line[];
  claims: Claim[];
  orderedKg: number;
  /** Expected minus ordered, never below zero. */
  unsoldKg: number;
  oversold: boolean;
};

function lineFor(entry: HarvestEtaEntry, raw: string, crops: Crop[], zones: Zone[], suffix: string): Line {
  const crop = entry.crop_id ? crops.find((c) => c.id === entry.crop_id) : undefined;
  const cropName =
    entry.main_crop?.trim() ||
    (crop ? crop.crop_name + (crop.variety ? ` · ${crop.variety}` : "") : "") ||
    "Unnamed";
  const beds =
    (crop?.zone_ids ?? [])
      .map((zid) => bedLabel(zones.find((z) => z.id === zid)))
      .filter(Boolean)
      .join(", ") ||
    entry.bed_name ||
    "—";
  const parsed = parseYieldKg(raw);
  return { id: `${entry.id}:${suffix}`, crop: cropName, beds, raw, kg: parsed.kg, isRange: parsed.isRange, unit: parsed.unit };
}

function buildMonths(
  months: SeasonMonth[],
  entries: HarvestEtaEntry[],
  crops: Crop[],
  zones: Zone[],
  orders: CustomerOrder[],
  customers: Customer[]
): MonthTotal[] {
  /* What one crop is expected to give in one month, for turning a share into
     kilos. Null when the sheet has nothing, or nothing readable as a weight. */
  const expectedFor = (cropId: string | null, m: SeasonMonth): number | null => {
    if (!cropId) return null;
    const row = entries.find((e) => e.crop_id === cropId && e.year === m.season) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return parseYieldKg((row[`${m.key}_expected`] as string | null) ?? "").kg;
  };

  return months.map((month) => {
    const expected: Line[] = [];
    const actual: Line[] = [];
    const unconverted: Line[] = [];

    for (const entry of entries) {
      if (entry.year !== month.season) continue;
      const row = entry as unknown as Record<string, unknown>;

      const rawExp = ((row[`${month.key}_expected`] as string | null) ?? "").trim();
      if (rawExp) {
        const line = lineFor(entry, rawExp, crops, zones, `${month.key}_exp`);
        expected.push(line);
        if (line.kg === null) unconverted.push(line);
      }

      const rawAct = ((row[`${month.key}_actual`] as string | null) ?? "").trim();
      if (rawAct) {
        const line = lineFor(entry, rawAct, crops, zones, `${month.key}_act`);
        actual.push(line);
        if (line.kg === null) unconverted.push(line);
      }
    }

    /* Orders placed on this month, plus standing orders on a crop that yields
       in it — the same rule the customers page and the shop follow. */
    const claims: Claim[] = [];
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const dated = o.season === month.season && o.month_key === month.key;
      const standing = isStandingOrder(o) && expectedFor(o.crop_id, month) !== null;
      if (!dated && !standing) continue;
      const crop = crops.find((c) => c.id === o.crop_id);
      claims.push({
        id: `${o.id}:${standing && !dated ? "s" : "d"}`,
        customer: customers.find((c) => c.id === o.customer_id)?.name ?? "Unknown customer",
        crop: crop ? crop.crop_name + (crop.variety ? ` · ${crop.variety}` : "") : "Any crop",
        amount: o.quantity_kg !== null ? `${o.quantity_kg} kg` : `${o.share_pct}%`,
        kg: orderKg(o, expectedFor(o.crop_id, month)),
        standing: standing && !dated,
      });
    }

    const sum = (lines: Line[]) => lines.reduce((total, l) => total + (l.kg ?? 0), 0);
    const expectedKg = sum(expected);
    const orderedKg = claims.reduce((total, c) => total + (c.kg ?? 0), 0);
    return {
      month,
      expected: expected.sort((a, b) => (b.kg ?? 0) - (a.kg ?? 0)),
      actual: actual.sort((a, b) => (b.kg ?? 0) - (a.kg ?? 0)),
      expectedKg,
      actualKg: sum(actual),
      unconverted,
      claims: claims.sort((a, b) => (b.kg ?? 0) - (a.kg ?? 0)),
      orderedKg,
      unsoldKg: Math.max(0, expectedKg - orderedKg),
      oversold: orderedKg > expectedKg && expectedKg > 0,
    };
  });
}

export default function ProduceExpectedPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [entries, setEntries] = useState<HarvestEtaEntry[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [year, setYear] = useState(() => harvestSeasonYear());
  const [fromNow, setFromNow] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  useFarmSelection({ farms, activeFarmId, setActiveFarmId });
  const activeFarmIdRef = useRef(activeFarmId);
  useEffect(() => {
    activeFarmIdRef.current = activeFarmId;
  }, [activeFarmId]);

  useEffect(() => {
    getFarms()
      .then(setFarms)
      .catch((err) => setError(errMsg(err, "Failed to load farms")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    const seasons = Array.from({ length: SEASON_SPAN }, (_, i) => year + i);
    setLoading(true);
    Promise.all([
      getHarvestEta(activeFarmId, seasons),
      getZones(activeFarmId),
      getCrops(activeFarmId),
      /* Orders may not be readable yet (the customers tables are newer than
         this page), and that should not stop the harvest totals showing. */
      getCustomerOrders(activeFarmId).catch(() => [] as CustomerOrder[]),
      getCustomers(activeFarmId).catch(() => [] as Customer[]),
    ])
      .then(([rows, zoneRows, cropRows, orderRows, customerRows]) => {
        if (activeFarmIdRef.current !== activeFarmId) return;
        setEntries(rows);
        setZones(zoneRows);
        setCrops(cropRows);
        setOrders(orderRows);
        setCustomers(customerRows);
      })
      .catch((err) => setError(errMsg(err, "Failed to load")))
      .finally(() => setLoading(false));
  }, [activeFarmId, year]);

  const months = useMemo(() => seasonMonths(year, SEASON_SPAN), [year]);
  const lastMonth = months[months.length - 1];
  const allTotals = useMemo(
    () => buildMonths(months, entries, crops, zones, orders, customers),
    [months, entries, crops, zones, orders, customers]
  );

  /* "From this month" hides months already gone by, which is what you want when
     asking what is still coming. */
  const currentSeason = harvestSeasonYear();
  const currentKey = harvestMonthKeyFor(new Date());
  const currentIndex = months.findIndex((m) => m.season === currentSeason && m.key === currentKey);
  const totals = useMemo(
    () => (fromNow && currentIndex > 0 ? allTotals.slice(currentIndex) : allTotals),
    [allTotals, fromNow, currentIndex]
  );

  const withProduce = totals.filter((t) => t.expected.length > 0 || t.actual.length > 0);
  const totalExpected = totals.reduce((sum, t) => sum + t.expectedKg, 0);
  const totalActual = totals.reduce((sum, t) => sum + t.actualKg, 0);
  const totalUnconverted = totals.reduce((sum, t) => sum + t.unconverted.length, 0);
  const totalOrdered = totals.reduce((sum, t) => sum + t.orderedKg, 0);
  const totalUnsold = totals.reduce((sum, t) => sum + t.unsoldKg, 0);
  const oversoldMonths = totals.filter((t) => t.oversold).length;
  const peak = withProduce.reduce<MonthTotal | null>(
    (best, t) => (!best || t.expectedKg > best.expectedKg ? t : best),
    null
  );

  const activeFarm = farms.find((f) => f.id === activeFarmId);

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Produce expected</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {activeFarm ? `${activeFarm.name} — ` : ""}totalled from the Harvest ETA sheet
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {farms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFarmId(f.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeFarmId === f.id
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {f.name}
                </button>
              ))}
              <Link href="/farm/harvest-eta" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                Harvest ETA
              </Link>
              <Link href="/farm" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                ← Farm
              </Link>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {/* Window + range toggle */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              ← {year - 1}
            </button>
            <span className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white">
              Mar {year} – {lastMonth.label} {lastMonth.calendarYear}
            </span>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              {year + 1} →
            </button>
          </div>
          <div className="flex rounded-full border border-zinc-200 bg-white p-1">
            {[
              { key: true, label: "From this month" },
              { key: false, label: "Whole window" },
            ].map((opt) => (
              <button
                key={String(opt.key)}
                onClick={() => setFromNow(opt.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  fromNow === opt.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Expected</p>
            <p className="mt-1 text-3xl font-semibold text-emerald-900">{fmtKg(totalExpected)}</p>
            <p className="mt-1 text-xs text-emerald-700">
              across {withProduce.length} month{withProduce.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-3xl border border-indigo-200 bg-indigo-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Sold</p>
            <p className="mt-1 text-3xl font-semibold text-indigo-900">{fmtKg(totalOrdered)}</p>
            <p className="mt-1 text-xs text-indigo-700">
              {totalExpected > 0 ? `${Math.round((totalOrdered / totalExpected) * 100)}% of expected` : "nothing ordered"}
            </p>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Still to sell</p>
            <p className="mt-1 text-3xl font-semibold text-amber-900">{fmtKg(totalUnsold)}</p>
            <p className="mt-1 text-xs text-amber-700">
              {oversoldMonths > 0
                ? `${oversoldMonths} month${oversoldMonths === 1 ? "" : "s"} oversold`
                : "expected minus ordered"}
            </p>
          </div>
          <div className="rounded-3xl border border-blue-200 bg-blue-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Picked so far</p>
            <p className="mt-1 text-3xl font-semibold text-blue-900">{fmtKg(totalActual)}</p>
            <p className="mt-1 text-xs text-blue-700">recorded as actual</p>
          </div>
        </div>

        {totalUnconverted > 0 && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {totalUnconverted} entr{totalUnconverted === 1 ? "y is" : "ies are"} not a weight (e.g. &ldquo;20 crates&rdquo;) and
            are left out of the totals. Open a month to see them.
          </div>
        )}

        {/* Months */}
        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">Loading...</div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            {totals.map((t) => {
              const key = `${t.month.season}:${t.month.key}`;
              const isOpen = expanded === key;
              const isEmpty = t.expected.length === 0 && t.actual.length === 0;
              const isCurrent = t.month.season === currentSeason && t.month.key === currentKey;
              return (
                <div key={key} className="border-b border-zinc-100 last:border-b-0">
                  <button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    disabled={isEmpty}
                    className={`flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition ${
                      isEmpty ? "cursor-default" : "hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-24 text-sm font-semibold ${isEmpty ? "text-zinc-400" : "text-zinc-900"}`}>
                        {t.month.label} {t.month.calendarYear}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white">this month</span>
                      )}
                      {!isEmpty && (
                        <span className="text-xs text-zinc-500">
                          {t.expected.length} crop{t.expected.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {t.orderedKg > 0 && (
                        <span className="hidden w-32 sm:block" title={`${fmtKg(t.orderedKg)} of ${fmtKg(t.expectedKg)} sold`}>
                          <span className="block h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                            <span
                              className={`block h-full ${t.oversold ? "bg-rose-500" : "bg-indigo-500"}`}
                              style={{ width: `${Math.min(100, t.expectedKg > 0 ? (t.orderedKg / t.expectedKg) * 100 : 100)}%` }}
                            />
                          </span>
                        </span>
                      )}
                      {t.actualKg > 0 && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {fmtKg(t.actualKg)} actual
                        </span>
                      )}
                      <span className="text-right text-xs text-zinc-500">
                        <span className={`block text-sm font-semibold ${t.expectedKg > 0 ? "text-emerald-700" : "text-zinc-300"}`}>
                          {t.expectedKg > 0 ? fmtKg(t.expectedKg) : "—"}
                        </span>
                        {t.orderedKg > 0 && (
                          <span className={t.oversold ? "text-rose-600" : "text-zinc-500"}>
                            {fmtKg(t.orderedKg)} sold
                            {t.oversold
                              ? ` · ${fmtKg(t.orderedKg - t.expectedKg)} over`
                              : ` · ${fmtKg(t.unsoldKg)} left`}
                          </span>
                        )}
                      </span>
                      {!isEmpty && <span className="text-xs text-zinc-400">{isOpen ? "▲" : "▼"}</span>}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                            <th className="py-1.5 text-left">Crop</th>
                            <th className="py-1.5 text-left">Bed(s)</th>
                            <th className="py-1.5 text-left">Written</th>
                            <th className="py-1.5 text-right">Kilos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.expected.map((l) => (
                            <tr key={l.id} className="border-t border-zinc-200/70">
                              <td className="py-1.5 pr-3 font-medium">{l.crop}</td>
                              <td className="py-1.5 pr-3 text-zinc-500">{l.beds}</td>
                              <td className="py-1.5 pr-3 text-zinc-500">
                                {l.raw}
                                {l.isRange && <span className="ml-1 text-zinc-400">(midpoint)</span>}
                              </td>
                              <td className={`py-1.5 text-right font-medium ${l.kg === null ? "text-amber-700" : "text-emerald-700"}`}>
                                {l.kg === null ? `not a weight${l.unit ? ` (${l.unit})` : ""}` : fmtKg(l.kg)}
                              </td>
                            </tr>
                          ))}
                          {t.actual.map((l) => (
                            <tr key={l.id} className="border-t border-zinc-200/70">
                              <td className="py-1.5 pr-3 font-medium">{l.crop}</td>
                              <td className="py-1.5 pr-3 text-zinc-500">{l.beds}</td>
                              <td className="py-1.5 pr-3 text-zinc-500">
                                {l.raw} <span className="text-blue-600">(actual)</span>
                              </td>
                              <td className={`py-1.5 text-right font-medium ${l.kg === null ? "text-amber-700" : "text-blue-700"}`}>
                                {l.kg === null ? `not a weight${l.unit ? ` (${l.unit})` : ""}` : fmtKg(l.kg)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {t.claims.length > 0 && (
                        <div className="mt-4 border-t border-zinc-200/70 pt-3">
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                            Sold to
                          </p>
                          <table className="w-full text-xs">
                            <tbody>
                              {t.claims.map((c) => (
                                <tr key={c.id} className="border-t border-zinc-200/70 first:border-t-0">
                                  <td className="py-1.5 pr-3 font-medium">
                                    {c.customer}
                                    {c.standing && (
                                      <span className="ml-1.5 rounded-full bg-zinc-200/70 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600">
                                        standing
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1.5 pr-3 text-zinc-500">{c.crop}</td>
                                  <td className="py-1.5 pr-3 text-zinc-500">{c.amount}</td>
                                  <td className={`py-1.5 text-right font-medium ${c.kg === null ? "text-amber-700" : "text-indigo-700"}`}>
                                    {c.kg === null ? "no estimate yet" : fmtKg(c.kg)}
                                  </td>
                                </tr>
                              ))}
                              <tr className="border-t border-zinc-300">
                                <td className="py-1.5 pr-3 font-semibold" colSpan={3}>
                                  {t.oversold ? "Oversold by" : "Still to sell"}
                                </td>
                                <td className={`py-1.5 text-right font-semibold ${t.oversold ? "text-rose-700" : "text-amber-700"}`}>
                                  {fmtKg(t.oversold ? t.orderedKg - t.expectedKg : t.unsoldKg)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && withProduce.length === 0 && (
          <p className="mt-4 text-center text-sm text-zinc-500">
            No estimates in this window yet. Add them on the{" "}
            <Link href="/farm/harvest-eta" className="underline">Harvest ETA sheet</Link>.
          </p>
        )}

        <p className="mt-4 text-xs text-zinc-400">
          Totals read the Harvest ETA month cells. Plain numbers are treated as kilos; g, t and lb are converted;
          a range like &ldquo;10-15kg&rdquo; counts as its midpoint. Sold figures come from customer orders — a
          share is worked out against that month&rsquo;s estimate, so it moves as the estimate does.
        </p>
      </div>
    </main>
  );
}
