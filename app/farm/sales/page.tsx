"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCollectedOrders, getCrops, getFarms, getSales } from "@/lib/farm";
import type { CollectedOrder, Crop, Farm, Sale } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useFarmRole } from "@/hooks/useFarmRole";
import { discardDraft } from "@/hooks/useFormDraft";
import { ManagerOnly } from "@/components/ManagerOnly";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useT, useLanguage } from "@/lib/i18n";
import { formatDate, formatMoney } from "@/app/farm/utils";
import { SaleForm } from "@/app/farm/components/SaleForm";
import type { SaleFormData } from "@/app/farm/components/SaleForm";
import { StackedMonthChart, StackedMonthTable } from "@/app/farm/components/StackedMonthChart";
import { ALL_MONTHS, MonthNavigator, initialMonth } from "@/app/farm/components/MonthNavigator";
import { NO_BUYER, summariseIncome, toIncomeRows } from "./income";
import type { IncomeRow } from "./income";

const ALL = ALL_MONTHS;

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

function saleToForm(s: Sale): SaleFormData {
  return {
    crop_id: s.crop_id ?? "",
    buyer_name: s.buyer_name ?? "",
    quantity_kg: s.quantity_kg != null ? String(s.quantity_kg) : "",
    price_per_kg: s.price_per_kg != null ? String(s.price_per_kg) : "",
    total_amount: s.total_amount != null ? String(s.total_amount) : "",
    sale_date: s.sale_date ?? "",
    notes: s.notes ?? "",
  };
}

function saleToRow(data: SaleFormData) {
  return {
    crop_id: data.crop_id || null,
    buyer_name: data.buyer_name.trim() || null,
    quantity_kg: data.quantity_kg ? Number(data.quantity_kg) : null,
    price_per_kg: data.price_per_kg ? Number(data.price_per_kg) : null,
    total_amount: data.total_amount ? Number(data.total_amount) : null,
    sale_date: data.sale_date,
    notes: data.notes.trim() || null,
  };
}

export default function SalesPage() {
  const t = useT();
  const [lang, setLang] = useLanguage();
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<CollectedOrder[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState<"chart" | "table">("chart");
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL);
  const [cropFilter, setCropFilter] = useState<string>(ALL);
  const [buyerFilter, setBuyerFilter] = useState<string>(ALL);
  const [sourceFilter, setSourceFilter] = useState<"all" | "sale" | "order">("all");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useFarmSelection({ farms, activeFarmId, setActiveFarmId });
  const { isManager, loading: roleLoading } = useFarmRole(activeFarmId);
  const activeFarmIdRef = useRef(activeFarmId);
  useEffect(() => {
    activeFarmIdRef.current = activeFarmId;
  }, [activeFarmId]);

  useEffect(() => {
    (async () => {
      try {
        setFarms(await getFarms());
      } catch (err) {
        setError(errMsg(err, t("Failed to load")));
        setLoading(false);
      }
    })();
  }, []);

  async function loadIncome(farmId: string) {
    const [saleRows, orderRows] = await Promise.all([getSales(farmId), getCollectedOrders(farmId)]);
    if (activeFarmIdRef.current !== farmId) return null;
    setSales(saleRows);
    setOrders(orderRows);
    return { saleRows, orderRows };
  }

  useEffect(() => {
    if (!activeFarmId) return;
    setLoading(true);
    setError("");
    setSelectedMonth(ALL);
    setCropFilter(ALL);
    setBuyerFilter(ALL);
    setSourceFilter("all");
    (async () => {
      try {
        const [loaded, cropRows] = await Promise.all([loadIncome(activeFarmId), getCrops(activeFarmId)]);
        if (!loaded || activeFarmIdRef.current !== activeFarmId) return;
        setCrops(cropRows);
        setSelectedMonth(
          initialMonth([
            ...loaded.saleRows.map((s) => (s.sale_date ?? "").slice(0, 7)),
            ...loaded.orderRows.map((o) => (o.collected_at ?? o.updated_at ?? "").slice(0, 7)),
          ])
        );
      } catch (err) {
        setError(errMsg(err, t("Failed to load")));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeFarmId]);

  const rows = useMemo(() => toIncomeRows(sales, orders, t), [sales, orders, t]);
  const summary = useMemo(() => summariseIncome(rows), [rows]);
  const chartData = useMemo(
    () => ({ series: summary.crops, months: summary.months, grandTotal: summary.grandTotal }),
    [summary]
  );
  const buyerNames = useMemo(() => summary.buyers.filter((b) => b.key !== NO_BUYER).map((b) => b.label), [summary]);
  const cropColor = useMemo(() => new Map(summary.crops.map((c) => [c.key, c.color])), [summary]);

  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (selectedMonth === ALL || r.date.startsWith(selectedMonth)) &&
          (cropFilter === ALL || r.cropKey === cropFilter) &&
          (buyerFilter === ALL || r.buyerKey === buyerFilter) &&
          (sourceFilter === "all" || r.source === sourceFilter)
      ),
    [rows, selectedMonth, cropFilter, buyerFilter, sourceFilter]
  );
  const shownTotal = shown.reduce((s, r) => s + Number(r.total ?? 0), 0);

  async function reload() {
    if (activeFarmIdRef.current) await loadIncome(activeFarmIdRef.current);
  }

  async function handleLogSale(data: SaleFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.sale_date) throw new Error(t("Sale date is required."));
      const { error: insertError } = await supabase.from("sales").insert({ farm_id: activeFarmId, ...saleToRow(data) });
      if (insertError) throw insertError;
      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "sale_logged",
        title: `Sale logged${data.buyer_name ? ` to ${data.buyer_name.trim()}` : ""}`,
        meta: data.total_amount ? formatMoney(Number(data.total_amount)) : "amount TBC",
      });
      await reload();
      if (selectedMonth !== ALL) setSelectedMonth(data.sale_date.slice(0, 7));
      setShowForm(false);
      return true;
    } catch (err) {
      setError(errMsg(err, t("Failed to log sale")));
      return false;
    }
  }

  async function handleUpdateSale(id: string, data: SaleFormData): Promise<boolean> {
    try {
      setError("");
      if (!data.sale_date) throw new Error(t("Sale date is required."));
      const { error: updateError } = await supabase.from("sales").update(saleToRow(data)).eq("id", id);
      if (updateError) throw updateError;
      await reload();
      setEditingId(null);
      return true;
    } catch (err) {
      setError(errMsg(err, t("Failed to update sale")));
      return false;
    }
  }

  async function handleDeleteSale(id: string) {
    try {
      setError("");
      setDeletingId(id);
      const { error: deleteError } = await supabase.from("sales").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await reload();
      setConfirmDeleteId(null);
    } catch (err) {
      setError(errMsg(err, t("Failed to delete sale")));
    } finally {
      setDeletingId(null);
    }
  }

  const selectMonth = useCallback((m: string) => setSelectedMonth(m), []);

  const activeFarm = farms.find((f) => f.id === activeFarmId);
  const select = "rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:border-zinc-900";

  if (activeFarmId && !roleLoading && !isManager) {
    return <ManagerOnly title={t("Sales — managers only")} />;
  }

  function rowDetails(r: IncomeRow) {
    const kg = r.quantityKg != null ? t("{n} kg", { n: r.quantityKg }) : null;
    const price = r.pricePerKg != null ? t("{amount}/kg", { amount: formatMoney(r.pricePerKg) }) : null;
    return [kg, price].filter(Boolean).join(" × ");
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{t("Shamba Farm Manager")}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("Sales")}</h1>
              {activeFarm && <p className="mt-1 text-sm text-zinc-500">{activeFarm.name}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {farms.length > 1 && farms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFarmId(f.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeFarmId === f.id ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"}`}
                >
                  {f.name}
                </button>
              ))}
              <LanguageToggle lang={lang} onChange={setLang} />
              <Link href="/farm" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                {t("← Farm")}
              </Link>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                {t("Sign out")}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">{t("Loading...")}</div>
        ) : (
          <>
            {/* Income by month, by crop */}
            <section className="mb-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{t("Monthly sales by crop")}</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">{t("Logged sales and collected shop orders together. Tap a month to open it.")}</p>
                </div>
                <div className="flex rounded-full border border-zinc-200 p-0.5">
                  <button onClick={() => setView("chart")} className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${view === "chart" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>{t("Chart")}</button>
                  <button onClick={() => setView("table")} className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${view === "table" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>{t("Table")}</button>
                </div>
              </div>
              <div className="mt-4">
                {summary.months.length === 0 ? (
                  <p className="text-sm text-zinc-400">{t("Log a sale, or mark a shop order collected, to see the months here.")}</p>
                ) : view === "chart" ? (
                  <StackedMonthChart data={chartData} selected={selectedMonth} onSelect={selectMonth} t={t} label={t("Monthly sales by crop")} />
                ) : (
                  <StackedMonthTable data={chartData} t={t} onSelect={selectMonth} />
                )}
              </div>
            </section>

            {/* Totals */}
            {rows.length > 0 && (
              <section className="mb-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium text-zinc-500">{t("All time")}</p>
                  <p className="mt-1 text-lg font-semibold">{formatMoney(summary.grandTotal)}</p>
                  <p className="text-xs text-zinc-500">{t("{n} logged", { n: rows.length })}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium text-zinc-500">{t("Top crops")}</p>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {summary.crops.slice(0, 3).map((c) => (
                      <li key={c.key} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: c.color }} />
                          <span className="truncate">{c.label}</span>
                        </span>
                        <span className="font-medium">{formatMoney(c.total)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium text-zinc-500">{t("Top buyers")}</p>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {summary.buyers.slice(0, 3).map((b) => (
                      <li key={b.key} className="flex items-center justify-between gap-2">
                        <span className="truncate">{b.label}</span>
                        <span className="font-medium">{formatMoney(b.total)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">
                {t("Logged sales {amount}", { amount: formatMoney(summary.salesTotal) })}
                {" · "}
                {t("Shop orders {amount}", { amount: formatMoney(summary.ordersTotal) })}
              </p>
              <button
                onClick={() => { setShowForm((v) => !v); setEditingId(null); }}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                {showForm ? t("Cancel") : t("+ Log sale")}
              </button>
            </div>

            {showForm && (
              <div className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold">{t("Log sale")}</h2>
                <div className="max-w-xl">
                  <SaleForm
                    crops={crops}
                    draftKey={`sale-new:${activeFarmId}`}
                    buyerSuggestions={buyerNames}
                    onSubmit={handleLogSale}
                  />
                </div>
              </div>
            )}

            <MonthNavigator
              months={summary.months}
              grandTotal={summary.grandTotal}
              selected={selectedMonth}
              onSelect={selectMonth}
              ready={!loading}
              t={t}
            />

            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select className={select} value={cropFilter} onChange={(e) => setCropFilter(e.target.value)} aria-label={t("Crop")}>
                  <option value={ALL}>{t("All crops")}</option>
                  {summary.crops.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <select className={select} value={buyerFilter} onChange={(e) => setBuyerFilter(e.target.value)} aria-label={t("Buyer name")}>
                  <option value={ALL}>{t("All buyers")}</option>
                  {summary.buyers.map((b) => (
                    <option key={b.key} value={b.key}>{b.label}</option>
                  ))}
                </select>
                <select className={select} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as "all" | "sale" | "order")} aria-label={t("Source")}>
                  <option value="all">{t("Sales and shop orders")}</option>
                  <option value="sale">{t("Logged sales")}</option>
                  <option value="order">{t("Shop orders")}</option>
                </select>
              </div>
              <p className="text-sm text-zinc-600">
                {formatMoney(shownTotal)}
                {" · "}
                {t("{n} logged", { n: shown.length })}
              </p>
            </div>

            {shown.length === 0 ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">{t("No sales here.")}</div>
            ) : (
              <div className="space-y-2">
                {shown.map((r) => (
                  <div key={`${r.source}-${r.id}`} className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    {r.source === "sale" && r.sale && editingId === r.id ? (
                      <div className="max-w-xl p-4">
                        <SaleForm
                          crops={crops}
                          initial={saleToForm(r.sale)}
                          draftKey={`sale-edit:${r.id}`}
                          buyerSuggestions={buyerNames}
                          submitLabel={t("Save changes")}
                          onSubmit={(data) => handleUpdateSale(r.id, data)}
                        />
                        <button onClick={() => { discardDraft(`sale-edit:${r.id}`); setEditingId(null); }} className="mt-2 text-sm text-zinc-500 hover:text-zinc-800">
                          {t("Cancel")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: cropColor.get(r.cropKey) }} />
                              {r.cropLabel}
                            </span>
                            <span className="text-xs text-zinc-400">{formatDate(r.date)}</span>
                            <span className="text-xs text-zinc-500">· {r.buyerLabel}</span>
                            {r.source === "order" && (
                              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800">
                                {t("Shop order")}{r.reference ? ` · ${r.reference}` : ""}
                              </span>
                            )}
                          </div>
                          {rowDetails(r) && <p className="mt-1 text-xs text-zinc-500">{rowDetails(r)}</p>}
                          {r.notes && <p className="mt-1 text-sm text-zinc-700">{r.notes}</p>}
                          <p className="mt-1 text-sm font-semibold">
                            {r.total != null ? formatMoney(r.total) : <span className="font-normal text-zinc-400">{t("Amount TBC")}</span>}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {r.source === "order" ? (
                            <Link href="/farm/orders" className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                              {t("View in Orders")}
                            </Link>
                          ) : confirmDeleteId === r.id ? (
                            <>
                              <span className="text-xs text-red-600">{t("Sure?")}</span>
                              <button
                                onClick={() => handleDeleteSale(r.id)}
                                disabled={deletingId === r.id}
                                className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                              >
                                {deletingId === r.id ? t("Deleting…") : t("Yes, delete")}
                              </button>
                              <button onClick={() => setConfirmDeleteId(null)} className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                                {t("Cancel")}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setConfirmDeleteId(null); setEditingId(r.id); }}
                                className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                {t("Edit")}
                              </button>
                              <button onClick={() => setConfirmDeleteId(r.id)} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                                {t("Delete")}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
