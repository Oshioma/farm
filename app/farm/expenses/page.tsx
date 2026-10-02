"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAssets, getCrops, getExpenses, getFarms, getZones } from "@/lib/farm";
import type { Asset, Crop, Expense, Farm, Zone } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useFarmRole } from "@/hooks/useFarmRole";
import { ManagerOnly } from "@/components/ManagerOnly";
import { discardDraft } from "@/hooks/useFormDraft";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useT, useLanguage } from "@/lib/i18n";
import { formatDate, formatMoney } from "@/app/farm/utils";
import { formatMonthLabel } from "@/app/farm/work-hours/MonthlyChart";
import { ExpenseForm } from "@/app/farm/components/ExpenseForm";
import type { ExpenseFormData } from "@/app/farm/components/ExpenseForm";
import { AssetForm } from "@/app/farm/components/AssetForm";
import type { AssetFormData } from "@/app/farm/components/AssetForm";
import { MonthlyTable, NOT_RECORDED, PayerTotals, SpendChart, assetMonth, payerKey, summariseSpend } from "./spend";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

const ALL = "all";

function expenseToForm(e: Expense): ExpenseFormData {
  return {
    category: e.category,
    amount: e.amount != null ? String(e.amount) : "",
    expense_date: e.expense_date,
    notes: e.notes ?? "",
    vendor_name: e.vendor_name ?? "",
    crop_id: e.crop_id ?? "",
    zone_id: e.zone_id ?? "",
  };
}

function assetToForm(a: Asset): AssetFormData {
  return {
    name: a.name,
    category: a.category,
    purchase_date: a.purchase_date ?? "",
    purchase_price: a.purchase_price != null ? String(a.purchase_price) : "",
    paid_by: a.paid_by ?? "",
    condition: a.condition ?? "good",
    notes: a.notes ?? "",
  };
}

export default function ExpensesPage() {
  const t = useT();
  const [lang, setLang] = useLanguage();
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<"expenses" | "assets">("expenses");
  const [view, setView] = useState<"chart" | "table">("chart");
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL);
  const [payerFilter, setPayerFilter] = useState<string>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);

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

  /* /farm/expenses#assets opens on the Assets tab. */
  useEffect(() => {
    if (window.location.hash === "#assets") setTab("assets");
  }, []);

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

  async function loadSpend(farmId: string) {
    const [expenseRows, assetRows] = await Promise.all([getExpenses(farmId), getAssets(farmId)]);
    if (activeFarmIdRef.current !== farmId) return null;
    setExpenses(expenseRows);
    setAssets(assetRows);
    return { expenseRows, assetRows };
  }

  useEffect(() => {
    if (!activeFarmId) return;
    setLoading(true);
    setError("");
    setSelectedMonth(ALL);
    setPayerFilter(ALL);
    setCategoryFilter(ALL);
    (async () => {
      try {
        const [loaded, zoneRows, cropRows] = await Promise.all([
          loadSpend(activeFarmId),
          getZones(activeFarmId),
          getCrops(activeFarmId),
        ]);
        if (!loaded || activeFarmIdRef.current !== activeFarmId) return;
        setZones(zoneRows);
        setCrops(cropRows);
        /* Open on the latest month with any spend. */
        const months = [
          ...loaded.expenseRows.map((e) => (e.expense_date ?? "").slice(0, 7)),
          ...loaded.assetRows.map(assetMonth),
        ].filter(Boolean).sort();
        setSelectedMonth(months[months.length - 1] ?? ALL);
      } catch (err) {
        setError(errMsg(err, t("Failed to load")));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeFarmId]);

  const summary = useMemo(() => summariseSpend(expenses, assets, t), [expenses, assets, t]);
  const payerNames = useMemo(() => summary.payers.filter((p) => p.key !== NOT_RECORDED).map((p) => p.label), [summary]);
  const categories = useMemo(() => [...new Set(expenses.map((e) => e.category))].sort(), [expenses]);
  const monthTotals = useMemo(() => new Map(summary.months.map((m) => [m.month, m.total])), [summary]);

  const shownExpenses = useMemo(
    () =>
      expenses.filter(
        (e) =>
          (selectedMonth === ALL || (e.expense_date ?? "").startsWith(selectedMonth)) &&
          (payerFilter === ALL || payerKey(e.vendor_name) === payerFilter) &&
          (categoryFilter === ALL || e.category === categoryFilter)
      ),
    [expenses, selectedMonth, payerFilter, categoryFilter]
  );

  const shownAssets = useMemo(
    () =>
      assets.filter(
        (a) =>
          (selectedMonth === ALL || assetMonth(a) === selectedMonth) &&
          (payerFilter === ALL || payerKey(a.paid_by) === payerFilter)
      ),
    [assets, selectedMonth, payerFilter]
  );

  const shownTotal =
    tab === "expenses"
      ? shownExpenses.reduce((s, e) => s + Number(e.amount ?? 0), 0)
      : shownAssets.reduce((s, a) => s + Number(a.purchase_price ?? 0), 0);

  async function reload() {
    if (activeFarmIdRef.current) await loadSpend(activeFarmIdRef.current);
  }

  function goToMonth(date: string) {
    const month = date.slice(0, 7);
    if (month && selectedMonth !== ALL) setSelectedMonth(month);
  }

  async function handleLogExpense(data: ExpenseFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.expense_date) throw new Error(t("Expense date is required."));
      const { error: insertError } = await supabase.from("expenses").insert({
        farm_id: activeFarmId,
        zone_id: data.zone_id || null,
        crop_id: data.crop_id || null,
        category: data.category,
        amount: data.amount ? Number(data.amount) : null,
        expense_date: data.expense_date,
        notes: data.notes || null,
        vendor_name: data.vendor_name.trim() || null,
      });
      if (insertError) throw insertError;
      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "expense_logged",
        title: `${data.category} expense logged`,
        meta: data.amount ? formatMoney(Number(data.amount)) : "amount TBC",
      });
      await reload();
      goToMonth(data.expense_date);
      setShowForm(false);
      return true;
    } catch (err) {
      setError(errMsg(err, t("Failed to log expense")));
      return false;
    }
  }

  async function handleUpdateExpense(id: string, data: ExpenseFormData): Promise<boolean> {
    try {
      setError("");
      if (!data.expense_date) throw new Error(t("Expense date is required."));
      const { error: updateError } = await supabase
        .from("expenses")
        .update({
          category: data.category,
          amount: data.amount ? Number(data.amount) : null,
          expense_date: data.expense_date,
          notes: data.notes || null,
          vendor_name: data.vendor_name.trim() || null,
          zone_id: data.zone_id || null,
          crop_id: data.crop_id || null,
        })
        .eq("id", id);
      if (updateError) throw updateError;
      await reload();
      setEditingId(null);
      return true;
    } catch (err) {
      setError(errMsg(err, t("Failed to update expense")));
      return false;
    }
  }

  async function handleLogAsset(data: AssetFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.name.trim()) throw new Error(t("Asset name is required."));
      const { error: insertError } = await supabase.from("assets").insert({
        farm_id: activeFarmId,
        name: data.name.trim(),
        category: data.category,
        purchase_date: data.purchase_date || null,
        purchase_price: data.purchase_price ? Number(data.purchase_price) : null,
        paid_by: data.paid_by.trim() || null,
        condition: data.condition,
        notes: data.notes.trim() || null,
      });
      if (insertError) throw insertError;
      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "asset_logged",
        title: `${data.name.trim()} logged`,
        meta: [data.category, data.paid_by.trim() ? `paid by ${data.paid_by.trim()}` : null].filter(Boolean).join(" · "),
      });
      await reload();
      if (data.purchase_date) goToMonth(data.purchase_date);
      setShowForm(false);
      return true;
    } catch (err) {
      setError(errMsg(err, t("Failed to log asset")));
      return false;
    }
  }

  async function handleUpdateAsset(id: string, data: AssetFormData): Promise<boolean> {
    try {
      setError("");
      if (!data.name.trim()) throw new Error(t("Asset name is required."));
      const { error: updateError } = await supabase
        .from("assets")
        .update({
          name: data.name.trim(),
          category: data.category,
          purchase_date: data.purchase_date || null,
          purchase_price: data.purchase_price ? Number(data.purchase_price) : null,
          paid_by: data.paid_by.trim() || null,
          condition: data.condition,
          notes: data.notes.trim() || null,
        })
        .eq("id", id);
      if (updateError) throw updateError;
      await reload();
      setEditingId(null);
      return true;
    } catch (err) {
      setError(errMsg(err, t("Failed to update asset")));
      return false;
    }
  }

  async function handleDelete(table: "expenses" | "assets", id: string) {
    try {
      setError("");
      setDeletingId(id);
      const { error: deleteError } = await supabase.from(table).delete().eq("id", id);
      if (deleteError) throw deleteError;
      await reload();
      setConfirmDeleteId(null);
    } catch (err) {
      setError(errMsg(err, table === "expenses" ? t("Failed to delete expense") : t("Failed to delete asset")));
    } finally {
      setDeletingId(null);
    }
  }

  function switchTab(next: "expenses" | "assets") {
    setTab(next);
    setShowForm(false);
    setEditingId(null);
    setConfirmDeleteId(null);
    setCategoryFilter(ALL);
  }

  const activeFarm = farms.find((f) => f.id === activeFarmId);
  const pill = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"}`;
  const select = "rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:border-zinc-900";

  if (activeFarmId && !roleLoading && !isManager) {
    return <ManagerOnly title={t("Expenses — managers only")} />;
  }

  function rowActions(table: "expenses" | "assets", id: string, onEdit: () => void) {
    if (confirmDeleteId === id) {
      return (
        <>
          <span className="text-xs text-red-600">{t("Sure?")}</span>
          <button
            onClick={() => handleDelete(table, id)}
            disabled={deletingId === id}
            className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deletingId === id ? t("Deleting…") : t("Yes, delete")}
          </button>
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {t("Cancel")}
          </button>
        </>
      );
    }
    return (
      <>
        <button
          onClick={() => { setConfirmDeleteId(null); onEdit(); }}
          className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {t("Edit")}
        </button>
        <button
          onClick={() => setConfirmDeleteId(id)}
          className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          {t("Delete")}
        </button>
      </>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{t("Shamba Farm Manager")}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("Expenses")}</h1>
              {activeFarm && <p className="mt-1 text-sm text-zinc-500">{activeFarm.name}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {farms.length > 1 && farms.map((f) => (
                <button key={f.id} onClick={() => setActiveFarmId(f.id)} className={pill(activeFarmId === f.id)}>
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
            {/* Spend by month, by person */}
            <section className="mb-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{t("Monthly spend by person")}</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">{t("Expenses and asset purchases together. Tap a month to open it.")}</p>
                </div>
                <div className="flex rounded-full border border-zinc-200 p-0.5">
                  <button onClick={() => setView("chart")} className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${view === "chart" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>{t("Chart")}</button>
                  <button onClick={() => setView("table")} className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${view === "table" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>{t("Table")}</button>
                </div>
              </div>
              <div className="mt-4">
                {summary.months.length === 0 ? (
                  <p className="text-sm text-zinc-400">{t("Log an expense to see the months here.")}</p>
                ) : view === "chart" ? (
                  <SpendChart summary={summary} selected={selectedMonth} onSelect={setSelectedMonth} t={t} />
                ) : (
                  <MonthlyTable summary={summary} t={t} onSelect={setSelectedMonth} />
                )}
              </div>
            </section>

            {/* Totals by person */}
            {summary.payers.length > 0 && (
              <section className="mb-6">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold">{t("Total spend by person")}</h2>
                  <p className="text-sm text-zinc-500">
                    {t("All time: {amount}", { amount: formatMoney(summary.grandTotal) })}
                    {" · "}
                    {t("Expenses {amount}", { amount: formatMoney(summary.expenseTotal) })}
                    {" · "}
                    {t("Assets {amount}", { amount: formatMoney(summary.assetTotal) })}
                  </p>
                </div>
                <PayerTotals summary={summary} t={t} />
              </section>
            )}

            {/* Expenses | Assets */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-full border border-zinc-200 bg-white p-0.5">
                <button onClick={() => switchTab("expenses")} className={`rounded-full px-5 py-2 text-sm font-medium transition ${tab === "expenses" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>
                  {t("Expenses")} <span className={tab === "expenses" ? "text-zinc-300" : "text-zinc-400"}>{expenses.length}</span>
                </button>
                <button onClick={() => switchTab("assets")} className={`rounded-full px-5 py-2 text-sm font-medium transition ${tab === "assets" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>
                  {t("Assets")} <span className={tab === "assets" ? "text-zinc-300" : "text-zinc-400"}>{assets.length}</span>
                </button>
              </div>
              <button
                onClick={() => { setShowForm((v) => !v); setEditingId(null); }}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                {showForm ? t("Cancel") : tab === "expenses" ? t("+ Log expense") : t("+ Log asset")}
              </button>
            </div>

            {showForm && (
              <div className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold">{tab === "expenses" ? t("Log expense") : t("Log asset")}</h2>
                <div className="max-w-xl">
                  {tab === "expenses" ? (
                    <ExpenseForm
                      zones={zones}
                      crops={crops}
                      defaultZoneId=""
                      draftKey={`expense-new:${activeFarmId}`}
                      payerSuggestions={payerNames}
                      onSubmit={handleLogExpense}
                    />
                  ) : (
                    <AssetForm
                      bare
                      draftKey={`asset-new:${activeFarmId}`}
                      payerSuggestions={payerNames}
                      onSubmit={handleLogAsset}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Month pills */}
            <div className="mb-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              <button onClick={() => setSelectedMonth(ALL)} className={pill(selectedMonth === ALL)}>
                {t("All months")}
              </button>
              {summary.months.map((m) => {
                const active = m.month === selectedMonth;
                return (
                  <button key={m.month} onClick={() => setSelectedMonth(m.month)} aria-pressed={active} className={pill(active)}>
                    {formatMonthLabel(m.month, t)}
                    <span className={`ml-2 text-xs ${active ? "text-zinc-300" : "text-zinc-400"}`}>{formatMoney(monthTotals.get(m.month) ?? 0).replace("TZS ", "")}</span>
                  </button>
                );
              })}
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select className={select} value={payerFilter} onChange={(e) => setPayerFilter(e.target.value)} aria-label={t("Paid by")}>
                  <option value={ALL}>{t("Everyone")}</option>
                  {summary.payers.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
                {tab === "expenses" && (
                  <select className={select} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label={t("Category")}>
                    <option value={ALL}>{t("All categories")}</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{t(c)}</option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-sm text-zinc-600">
                <span className="font-semibold text-zinc-900">{selectedMonth === ALL ? t("All months") : formatMonthLabel(selectedMonth, t)}</span>
                {" · "}
                {formatMoney(shownTotal)}
                {" · "}
                {t("{n} logged", { n: tab === "expenses" ? shownExpenses.length : shownAssets.length })}
              </p>
            </div>

            {tab === "expenses" ? (
              shownExpenses.length === 0 ? (
                <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">{t("No expenses here.")}</div>
              ) : (
                <div className="space-y-2">
                  {shownExpenses.map((expense) => (
                    <div key={expense.id} className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
                      {editingId === expense.id ? (
                        <div className="max-w-xl p-4">
                          <ExpenseForm
                            zones={zones}
                            crops={crops}
                            defaultZoneId=""
                            initial={expenseToForm(expense)}
                            draftKey={`expense-edit:${expense.id}`}
                            payerSuggestions={payerNames}
                            submitLabel={t("Save changes")}
                            onSubmit={(data) => handleUpdateExpense(expense.id, data)}
                          />
                          <button onClick={() => { discardDraft(`expense-edit:${expense.id}`); setEditingId(null); }} className="mt-2 text-sm text-zinc-500 hover:text-zinc-800">
                            {t("Cancel")}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-700">{t(expense.category)}</span>
                              <span className="text-xs text-zinc-400">{formatDate(expense.expense_date)}</span>
                              <span className="text-xs text-zinc-500">· {expense.vendor_name?.trim() || t("Not recorded")}</span>
                              {expense.crop?.[0]?.crop_name && <span className="text-xs text-zinc-400">· {expense.crop[0].crop_name}</span>}
                              {expense.zone?.[0]?.name && <span className="text-xs text-zinc-400">· {expense.zone[0].name}</span>}
                            </div>
                            {expense.notes && <p className="mt-1 text-sm text-zinc-700">{expense.notes}</p>}
                            <p className="mt-1 text-sm font-semibold">
                              {expense.amount != null ? formatMoney(expense.amount) : <span className="font-normal text-zinc-400">{t("Amount TBC")}</span>}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {rowActions("expenses", expense.id, () => setEditingId(expense.id))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : shownAssets.length === 0 ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">{t("No assets here.")}</div>
            ) : (
              <div className="space-y-2">
                {shownAssets.map((asset) => (
                  <div key={asset.id} className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    {editingId === asset.id ? (
                      <div className="max-w-xl p-4">
                        <AssetForm
                          bare
                          initial={assetToForm(asset)}
                          draftKey={`asset-edit:${asset.id}`}
                          payerSuggestions={payerNames}
                          submitLabel={t("Save changes")}
                          onSubmit={(data) => handleUpdateAsset(asset.id, data)}
                        />
                        <button onClick={() => { discardDraft(`asset-edit:${asset.id}`); setEditingId(null); }} className="mt-2 text-sm text-zinc-500 hover:text-zinc-800">
                          {t("Cancel")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{asset.name}</span>
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-700">{t(asset.category)}</span>
                            {asset.condition && <span className="text-xs capitalize text-zinc-400">{t(asset.condition)}</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-zinc-400">{asset.purchase_date ? formatDate(asset.purchase_date) : t("No purchase date")}</span>
                            <span className="text-zinc-500">· {asset.paid_by?.trim() || t("Not recorded")}</span>
                          </div>
                          {asset.notes && <p className="mt-1 text-sm text-zinc-700">{asset.notes}</p>}
                          <p className="mt-1 text-sm font-semibold">
                            {asset.purchase_price != null ? formatMoney(asset.purchase_price) : <span className="font-normal text-zinc-400">{t("Amount TBC")}</span>}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {rowActions("assets", asset.id, () => setEditingId(asset.id))}
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
