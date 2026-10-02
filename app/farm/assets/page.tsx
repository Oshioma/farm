"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAssets, getFarms } from "@/lib/farm";
import type { Asset, Farm } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useFarmRole } from "@/hooks/useFarmRole";
import { discardDraft } from "@/hooks/useFormDraft";
import { ManagerOnly } from "@/components/ManagerOnly";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useT, useLanguage } from "@/lib/i18n";
import { formatDate, formatMoney } from "@/app/farm/utils";
import { AssetForm } from "@/app/farm/components/AssetForm";
import type { AssetFormData } from "@/app/farm/components/AssetForm";
import { assignColors } from "@/app/farm/components/StackedMonthChart";
import { NOT_RECORDED, payerKey } from "@/app/farm/expenses/spend";

const ALL = "all";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
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

function assetToRow(data: AssetFormData) {
  return {
    name: data.name.trim(),
    category: data.category,
    purchase_date: data.purchase_date || null,
    purchase_price: data.purchase_price ? Number(data.purchase_price) : null,
    paid_by: data.paid_by.trim() || null,
    condition: data.condition,
    notes: data.notes.trim() || null,
  };
}

/* Categories and conditions are free text in older rows ("Tools", "tools"),
   so group them case-insensitively. */
const lower = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

export default function AssetsPage() {
  const t = useT();
  const [lang, setLang] = useLanguage();
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [payerFilter, setPayerFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [conditionFilter, setConditionFilter] = useState(ALL);

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

  async function loadAssets(farmId: string) {
    const rows = await getAssets(farmId);
    if (activeFarmIdRef.current === farmId) setAssets(rows);
  }

  useEffect(() => {
    if (!activeFarmId) return;
    setLoading(true);
    setError("");
    setPayerFilter(ALL);
    setCategoryFilter(ALL);
    setConditionFilter(ALL);
    loadAssets(activeFarmId)
      .catch((err) => setError(errMsg(err, t("Failed to load"))))
      .finally(() => setLoading(false));
  }, [activeFarmId]);

  /* Who paid, biggest first, with "Not recorded" last; and the same for
     categories. */
  const payers = useMemo(() => {
    const map = new Map<string, { label: string; total: number; count: number; spellings: Map<string, number> }>();
    for (const a of assets) {
      const key = payerKey(a.paid_by);
      const p = map.get(key) ?? { label: "", total: 0, count: 0, spellings: new Map<string, number>() };
      p.total += Number(a.purchase_price ?? 0);
      p.count += 1;
      const spelling = (a.paid_by ?? "").trim();
      if (spelling) p.spellings.set(spelling, (p.spellings.get(spelling) ?? 0) + 1);
      map.set(key, p);
    }
    const sorted = [...map.entries()]
      .map(([key, p]) => ({
        key,
        label: key === NOT_RECORDED ? t("Not recorded") : [...p.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
        total: p.total,
        count: p.count,
      }))
      .sort((a, b) => (a.key === NOT_RECORDED ? 1 : b.key === NOT_RECORDED ? -1 : b.total - a.total));
    return assignColors(sorted, [NOT_RECORDED]);
  }, [assets, t]);

  const categories = useMemo(() => {
    const map = new Map<string, { label: string; total: number; count: number }>();
    for (const a of assets) {
      const key = lower(a.category) || "other";
      const c = map.get(key) ?? { label: key, total: 0, count: 0 };
      c.total += Number(a.purchase_price ?? 0);
      c.count += 1;
      map.set(key, c);
    }
    return [...map.entries()].map(([key, c]) => ({ key, ...c })).sort((a, b) => b.total - a.total);
  }, [assets]);

  const conditions = useMemo(() => [...new Set(assets.map((a) => lower(a.condition)).filter(Boolean))].sort(), [assets]);
  const payerNames = useMemo(() => payers.filter((p) => p.key !== NOT_RECORDED).map((p) => p.label), [payers]);
  const payerColor = useMemo(() => new Map(payers.map((p) => [p.key, p.color])), [payers]);
  const grandTotal = payers.reduce((s, p) => s + p.total, 0);

  /* Newest purchase first; assets without a purchase date go last. */
  const shown = useMemo(
    () =>
      assets
        .filter(
          (a) =>
            (payerFilter === ALL || payerKey(a.paid_by) === payerFilter) &&
            (categoryFilter === ALL || (lower(a.category) || "other") === categoryFilter) &&
            (conditionFilter === ALL || lower(a.condition) === conditionFilter)
        )
        .sort((a, b) => (b.purchase_date ?? "").localeCompare(a.purchase_date ?? "")),
    [assets, payerFilter, categoryFilter, conditionFilter]
  );
  const shownTotal = shown.reduce((s, a) => s + Number(a.purchase_price ?? 0), 0);

  async function reload() {
    if (activeFarmIdRef.current) await loadAssets(activeFarmIdRef.current);
  }

  async function handleLogAsset(data: AssetFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.name.trim()) throw new Error(t("Asset name is required."));
      const { error: insertError } = await supabase.from("assets").insert({ farm_id: activeFarmId, ...assetToRow(data) });
      if (insertError) throw insertError;
      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "asset_logged",
        title: `${data.name.trim()} logged`,
        meta: [data.category, data.paid_by.trim() ? `paid by ${data.paid_by.trim()}` : null].filter(Boolean).join(" · "),
      });
      await reload();
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
      const { error: updateError } = await supabase.from("assets").update(assetToRow(data)).eq("id", id);
      if (updateError) throw updateError;
      await reload();
      setEditingId(null);
      return true;
    } catch (err) {
      setError(errMsg(err, t("Failed to update asset")));
      return false;
    }
  }

  async function handleDelete(id: string) {
    try {
      setError("");
      setDeletingId(id);
      const { error: deleteError } = await supabase.from("assets").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await reload();
      setConfirmDeleteId(null);
    } catch (err) {
      setError(errMsg(err, t("Failed to delete asset")));
    } finally {
      setDeletingId(null);
    }
  }

  const activeFarm = farms.find((f) => f.id === activeFarmId);
  const select = "rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:border-zinc-900";

  if (activeFarmId && !roleLoading && !isManager) {
    return <ManagerOnly title={t("Assets — managers only")} />;
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{t("Shamba Farm Manager")}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("Assets")}</h1>
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
            {/* Totals */}
            {assets.length > 0 && (
              <section className="mb-6 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium text-zinc-500">{t("Total paid for assets")}</p>
                  <p className="mt-1 text-2xl font-semibold">{formatMoney(grandTotal)}</p>
                  <p className="text-xs text-zinc-500">{t("{n} logged", { n: assets.length })}</p>
                  <Link href="/farm/expenses" className="mt-2 inline-block text-xs font-medium text-zinc-600 underline-offset-2 hover:underline">
                    {t("Spend with expenses, by month →")}
                  </Link>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium text-zinc-500">{t("Paid by")}</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {payers.map((p) => {
                      const share = grandTotal > 0 ? Math.round((p.total / grandTotal) * 100) : 0;
                      return (
                        <li key={p.key}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />
                              <span className="truncate">{p.label}</span>
                            </span>
                            <span className="font-medium">{formatMoney(p.total)}</span>
                          </div>
                          <div className="mt-0.5 h-1 rounded-full bg-zinc-100">
                            <div className="h-1 rounded-full" style={{ width: `${share}%`, background: p.color }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium text-zinc-500">{t("By category")}</p>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {categories.map((c) => (
                      <li key={c.key} className="flex items-center justify-between gap-2">
                        <span className="truncate capitalize">{t(c.label)} <span className="text-xs text-zinc-400">· {c.count}</span></span>
                        <span className="font-medium">{formatMoney(c.total)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select className={select} value={payerFilter} onChange={(e) => setPayerFilter(e.target.value)} aria-label={t("Paid by")}>
                  <option value={ALL}>{t("Everyone")}</option>
                  {payers.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
                <select className={select} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label={t("Category")}>
                  <option value={ALL}>{t("All categories")}</option>
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>{t(c.label)}</option>
                  ))}
                </select>
                <select className={select} value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} aria-label={t("Condition")}>
                  <option value={ALL}>{t("Any condition")}</option>
                  {conditions.map((c) => (
                    <option key={c} value={c}>{t(c)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-zinc-600">
                  {formatMoney(shownTotal)} · {t("{n} logged", { n: shown.length })}
                </p>
                <button
                  onClick={() => { setShowForm((v) => !v); setEditingId(null); }}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  {showForm ? t("Cancel") : t("+ Log asset")}
                </button>
              </div>
            </div>

            {showForm && (
              <div className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold">{t("Log asset")}</h2>
                <div className="max-w-xl">
                  <AssetForm bare draftKey={`asset-new:${activeFarmId}`} payerSuggestions={payerNames} onSubmit={handleLogAsset} />
                </div>
              </div>
            )}

            {shown.length === 0 ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
                {assets.length === 0 ? t("No assets logged yet.") : t("No assets here.")}
              </div>
            ) : (
              <div className="space-y-2">
                {shown.map((asset) => (
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
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-700">{t(lower(asset.category) || "other")}</span>
                            {asset.condition && <span className="text-xs capitalize text-zinc-400">{t(lower(asset.condition))}</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-zinc-400">{asset.purchase_date ? formatDate(asset.purchase_date) : t("No purchase date")}</span>
                            <span className="flex items-center gap-1 text-zinc-500">
                              · <span className="inline-block h-2 w-2 rounded-sm" style={{ background: payerColor.get(payerKey(asset.paid_by)) }} />
                              {asset.paid_by?.trim() || t("Not recorded")}
                            </span>
                          </div>
                          {asset.notes && <p className="mt-1 text-sm text-zinc-700">{asset.notes}</p>}
                          <p className="mt-1 text-sm font-semibold">
                            {asset.purchase_price != null ? formatMoney(asset.purchase_price) : <span className="font-normal text-zinc-400">{t("Amount TBC")}</span>}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {confirmDeleteId === asset.id ? (
                            <>
                              <span className="text-xs text-red-600">{t("Sure?")}</span>
                              <button
                                onClick={() => handleDelete(asset.id)}
                                disabled={deletingId === asset.id}
                                className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                              >
                                {deletingId === asset.id ? t("Deleting…") : t("Yes, delete")}
                              </button>
                              <button onClick={() => setConfirmDeleteId(null)} className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                                {t("Cancel")}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setConfirmDeleteId(null); setEditingId(asset.id); }}
                                className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                {t("Edit")}
                              </button>
                              <button onClick={() => setConfirmDeleteId(asset.id)} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
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
