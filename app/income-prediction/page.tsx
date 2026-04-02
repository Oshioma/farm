"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFarms, getIncomePrediction } from "@/lib/farm";
import type { Farm, IncomePredictionRow } from "@/lib/farm";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

const YEARS = [
  { key: "y1",  label: "Y1" },
  { key: "y2",  label: "Y2" },
  { key: "y3",  label: "Y3" },
  { key: "y4",  label: "Y4" },
  { key: "y5",  label: "Y5" },
  { key: "y6",  label: "Y6" },
  { key: "y10", label: "Y10" },
  { key: "y15", label: "Y15" },
] as const;

type YearKey = typeof YEARS[number]["key"];

const blankForm = {
  species: "",
  y1_qty: "", y1_income: "",
  y2_qty: "", y2_income: "",
  y3_qty: "", y3_income: "",
  y4_qty: "", y4_income: "",
  y5_qty: "", y5_income: "",
  y6_qty: "", y6_income: "",
  y10_qty: "", y10_income: "",
  y15_qty: "", y15_income: "",
};

type FormState = typeof blankForm;

function toInsertPayload(farmId: string, f: FormState, sortOrder: number) {
  const num = (v: string) => v.trim() ? parseInt(v.replace(/[^0-9]/g, ""), 10) || null : null;
  const txt = (v: string) => v.trim() || null;
  return {
    farm_id: farmId, species: f.species.trim(), sort_order: sortOrder,
    y1_qty: txt(f.y1_qty),   y1_income: num(f.y1_income),
    y2_qty: txt(f.y2_qty),   y2_income: num(f.y2_income),
    y3_qty: txt(f.y3_qty),   y3_income: num(f.y3_income),
    y4_qty: txt(f.y4_qty),   y4_income: num(f.y4_income),
    y5_qty: txt(f.y5_qty),   y5_income: num(f.y5_income),
    y6_qty: txt(f.y6_qty),   y6_income: num(f.y6_income),
    y10_qty: txt(f.y10_qty), y10_income: num(f.y10_income),
    y15_qty: txt(f.y15_qty), y15_income: num(f.y15_income),
  };
}

function rowToForm(r: IncomePredictionRow): FormState {
  const s = (v: number | null) => v != null ? String(v) : "";
  return {
    species: r.species,
    y1_qty: r.y1_qty ?? "",   y1_income: s(r.y1_income),
    y2_qty: r.y2_qty ?? "",   y2_income: s(r.y2_income),
    y3_qty: r.y3_qty ?? "",   y3_income: s(r.y3_income),
    y4_qty: r.y4_qty ?? "",   y4_income: s(r.y4_income),
    y5_qty: r.y5_qty ?? "",   y5_income: s(r.y5_income),
    y6_qty: r.y6_qty ?? "",   y6_income: s(r.y6_income),
    y10_qty: r.y10_qty ?? "", y10_income: s(r.y10_income),
    y15_qty: r.y15_qty ?? "", y15_income: s(r.y15_income),
  };
}

function fmtIncome(v: number | null) {
  if (v == null) return "";
  return v.toLocaleString();
}

function fmtQty(v: string | null) {
  if (!v || v === "0") return v ?? "";
  return v;
}

export default function IncomePredictionPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [rows, setRows] = useState<IncomePredictionRow[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(blankForm);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function loadRows(farmId: string) {
    const data = await getIncomePrediction(farmId);
    setRows(data);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const farmRows = await getFarms();
        setFarms(farmRows);
        if (farmRows.length > 0) {
          setActiveFarmId(farmRows[0].id);
          await loadRows(farmRows[0].id);
        }
      } catch (err) {
        setError(errMsg(err, "Failed to load"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    setLoading(true);
    loadRows(activeFarmId)
      .catch((err) => setError(errMsg(err, "Failed to load")))
      .finally(() => setLoading(false));
  }, [activeFarmId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarmId || !form.species.trim()) return;
    setSaving(true);
    setError("");
    try {
      const { error: err } = await supabase
        .from("income_prediction")
        .insert(toInsertPayload(activeFarmId, form, rows.length));
      if (err) throw err;
      setForm(blankForm);
      setShowForm(false);
      await loadRows(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id: string, sortOrder: number) {
    setSavingEditId(id);
    setError("");
    try {
      const payload = toInsertPayload(activeFarmId, editForm, sortOrder);
      const { farm_id: _, sort_order: __, ...updatePayload } = payload;
      const { error: err } = await supabase
        .from("income_prediction")
        .update(updatePayload)
        .eq("id", id);
      if (err) throw err;
      setEditingId(null);
      await loadRows(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to update"));
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error: err } = await supabase.from("income_prediction").delete().eq("id", id);
    if (err) setError(errMsg(err, "Failed to delete"));
    else setRows((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  // Totals
  const totals = YEARS.reduce((acc, { key }) => {
    acc[key] = rows.reduce((sum, r) => sum + (r[`${key}_income` as keyof IncomePredictionRow] as number | null ?? 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const activeFarm = farms.find((f) => f.id === activeFarmId);

  function field(f: FormState, key: string, onChange: (k: string, v: string) => void, placeholder = "") {
    return (
      <input
        type="text"
        value={(f as Record<string, string>)[key]}
        onChange={(e) => onChange(key, e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-[60px] rounded-lg border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-900"
      />
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-full px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Income prediction</h1>
              {activeFarm && <p className="mt-1 text-sm text-zinc-500">{activeFarm.name}</p>}
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
              <Link
                href="/farm"
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
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
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        <div className="mb-6">
          <button
            onClick={() => setShowForm((v) => !v)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              showForm ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <TrendingUp size={15} />
            Add species
          </button>

          {showForm && (
            <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">New species</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium">Species name</label>
                  <input
                    type="text"
                    value={form.species}
                    onChange={(e) => setForm((p) => ({ ...p, species: e.target.value }))}
                    className="w-64 rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="e.g. Mango"
                    required
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr className="text-left text-zinc-500">
                        <th className="w-20 pb-2 pr-3">Year</th>
                        <th className="w-24 pb-2 pr-3">Qty</th>
                        <th className="w-28 pb-2 pr-3">Income</th>
                      </tr>
                    </thead>
                    <tbody>
                      {YEARS.map(({ key, label }) => (
                        <tr key={key} className="border-t border-zinc-100">
                          <td className="py-1.5 pr-3 font-semibold text-zinc-500">{label}</td>
                          <td className="py-1.5 pr-3">
                            {field(form, `${key}_qty`, (k, v) => setForm((p) => ({ ...p, [k]: v })), "—")}
                          </td>
                          <td className="py-1.5 pr-3">
                            {field(form, `${key}_income`, (k, v) => setForm((p) => ({ ...p, [k]: v })), "0")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-3">
                  <button type="submit" disabled={saving}
                    className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60">
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setForm(blankForm); }}
                    className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {loading && rows.length === 0 ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <TrendingUp className="mx-auto mb-3 text-zinc-300" size={32} />
            <p className="text-sm text-zinc-500">No data yet. Add a species above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="sticky left-0 z-10 bg-white px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Species
                  </th>
                  {YEARS.map(({ key, label }) => (
                    <th key={key} colSpan={2}
                      className="border-l border-zinc-100 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      {label}
                    </th>
                  ))}
                  <th className="px-4 py-4"></th>
                </tr>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="sticky left-0 z-10 bg-zinc-50 px-5 py-2"></th>
                  {YEARS.map(({ key }) => (
                    <>
                      <th key={`${key}-qty`} className="border-l border-zinc-100 px-3 py-2 text-right text-xs font-normal text-zinc-400">Qty</th>
                      <th key={`${key}-inc`} className="px-3 py-2 text-right text-xs font-normal text-zinc-400">Income</th>
                    </>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  editingId === row.id ? (
                    <tr key={row.id} className="border-b border-zinc-100 bg-amber-50/40">
                      <td className="sticky left-0 z-10 bg-amber-50/80 px-3 py-2">
                        <input type="text" value={editForm.species}
                          onChange={(e) => setEditForm((p) => ({ ...p, species: e.target.value }))}
                          className="w-32 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      {YEARS.map(({ key }) => (
                        <>
                          <td key={`${key}-qty`} className="border-l border-zinc-100 px-2 py-2">
                            {field(editForm, `${key}_qty`, (k, v) => setEditForm((p) => ({ ...p, [k]: v })))}
                          </td>
                          <td key={`${key}-inc`} className="px-2 py-2">
                            {field(editForm, `${key}_income`, (k, v) => setEditForm((p) => ({ ...p, [k]: v })))}
                          </td>
                        </>
                      ))}
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(row.id, row.sort_order)}
                            disabled={savingEditId === row.id}
                            className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60">
                            {savingEditId === row.id ? "…" : "Save"}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.id} className={`border-b border-zinc-100 last:border-0 ${i % 2 === 0 ? "" : "bg-zinc-50/40"}`}>
                      <td className={`sticky left-0 z-10 px-5 py-3 font-medium ${i % 2 === 0 ? "bg-white" : "bg-zinc-50"}`}>
                        {row.species}
                      </td>
                      {YEARS.map(({ key }) => {
                        const qty = row[`${key}_qty` as keyof IncomePredictionRow] as string | null;
                        const inc = row[`${key}_income` as keyof IncomePredictionRow] as number | null;
                        return (
                          <>
                            <td key={`${key}-qty`} className="border-l border-zinc-100 px-3 py-3 text-right tabular-nums text-zinc-600">
                              {fmtQty(qty) || <span className="text-zinc-300">—</span>}
                            </td>
                            <td key={`${key}-inc`} className="px-3 py-3 text-right tabular-nums text-zinc-700">
                              {inc ? fmtIncome(inc) : <span className="text-zinc-300">—</span>}
                            </td>
                          </>
                        );
                      })}
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingId(row.id); setEditForm(rowToForm(row)); }}
                            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(row.id)} disabled={deletingId === row.id}
                            className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}

                {/* Totals row */}
                <tr className="border-t-2 border-zinc-200 bg-zinc-900 text-white">
                  <td className="sticky left-0 z-10 bg-zinc-900 px-5 py-4 text-xs font-bold uppercase tracking-wider">
                    Total
                  </td>
                  {YEARS.map(({ key }) => (
                    <>
                      <td key={`${key}-qty`} className="border-l border-zinc-700 px-3 py-4"></td>
                      <td key={`${key}-inc`} className="px-3 py-4 text-right tabular-nums text-sm font-semibold">
                        {totals[key] ? fmtIncome(totals[key]) : <span className="text-zinc-500">—</span>}
                      </td>
                    </>
                  ))}
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
