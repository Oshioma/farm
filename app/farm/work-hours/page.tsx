"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms, getWorkHours } from "@/lib/farm";
import type { Farm, WorkHoursEntry } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { WORKERS } from "@/lib/workers";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

function fmt(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const blankForm = { date: "", worker_name: "", hours: "", role: "operational", notes: "" };

type QuickRow = { worker_name: string; hours: string; notes: string };
const blankQuickRow: QuickRow = { worker_name: "", hours: "", notes: "" };

export default function WorkHoursPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [entries, setEntries] = useState<WorkHoursEntry[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"log" | "summary">("log");
  const [roleFilter, setRoleFilter] = useState<"all" | "operational" | "manager">("all");

  const [modal, setModal] = useState<WorkHoursEntry | null | "new">(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quick add (multiple people's work for one day, each with their own hours + description)
  const [quickMode, setQuickMode] = useState(false);
  const [quickDate, setQuickDate] = useState("");
  const [quickRole, setQuickRole] = useState("operational");
  const [quickRows, setQuickRows] = useState<QuickRow[]>([{ ...blankQuickRow }]);
  const [quickSaving, setQuickSaving] = useState(false);

  const router = useRouter();
  useFarmSelection({ farms, activeFarmId, setActiveFarmId });
  const activeFarmIdRef = useRef(activeFarmId);
  useEffect(() => {
    activeFarmIdRef.current = activeFarmId;
  }, [activeFarmId]);

  async function loadEntries(farmId: string) {
    const rows = await getWorkHours(farmId);
    if (activeFarmIdRef.current !== farmId) return;
    setEntries(rows);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const farmRows = await getFarms();
        setFarms(farmRows);
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
    loadEntries(activeFarmId)
      .catch((err) => setError(errMsg(err, "Failed to load")))
      .finally(() => setLoading(false));
  }, [activeFarmId]);

  async function handleSave() {
    if (!activeFarmId || !form.worker_name.trim() || !form.hours) return;
    try {
      setSaving(true);
      setError("");
      const payload = {
        farm_id: activeFarmId,
        date: form.date || null,
        worker_name: form.worker_name.trim(),
        hours: Number(form.hours),
        role: form.role,
        notes: form.notes.trim() || null,
      };
      if (modal === "new") {
        const { error: e } = await supabase.from("work_hours").insert(payload);
        if (e) throw e;
      } else if (modal) {
        const { error: e } = await supabase.from("work_hours").update(payload).eq("id", (modal as WorkHoursEntry).id);
        if (e) throw e;
      }
      await loadEntries(activeFarmId);
      setModal(null);
    } catch (err) {
      setError(errMsg(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickSave() {
    if (!activeFarmId || !quickDate) return;
    const rows = quickRows
      .filter((r) => r.worker_name.trim() && Number(r.hours) > 0)
      .map((r) => ({
        farm_id: activeFarmId,
        date: quickDate,
        worker_name: r.worker_name.trim(),
        hours: Number(r.hours),
        role: quickRole,
        notes: r.notes.trim() || null,
      }));
    if (rows.length === 0) return;
    try {
      setQuickSaving(true);
      setError("");
      const { error: e } = await supabase.from("work_hours").insert(rows);
      if (e) throw e;
      await loadEntries(activeFarmId);
      setQuickRows([{ ...blankQuickRow }]);
      setQuickMode(false);
    } catch (err) {
      setError(errMsg(err, "Failed to save"));
    } finally {
      setQuickSaving(false);
    }
  }

  function updateQuickRow(index: number, patch: Partial<QuickRow>) {
    setQuickRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addQuickRow() {
    setQuickRows((prev) => [...prev, { ...blankQuickRow }]);
  }

  function removeQuickRow(index: number) {
    setQuickRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);
      const { error: e } = await supabase.from("work_hours").delete().eq("id", id);
      if (e) throw e;
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(errMsg(err, "Failed to delete"));
    } finally {
      setDeletingId(null);
    }
  }

  function openEdit(entry: WorkHoursEntry) {
    setForm({
      date: entry.date ?? "",
      worker_name: entry.worker_name,
      hours: String(entry.hours),
      role: entry.role,
      notes: entry.notes ?? "",
    });
    setModal(entry);
  }

  const filtered = useMemo(() => {
    if (roleFilter === "all") return entries;
    return entries.filter((e) => e.role === roleFilter);
  }, [entries, roleFilter]);

  // Summary: total hours per worker
  const summary = useMemo(() => {
    const map = new Map<string, { operational: number; manager: number }>();
    for (const e of entries) {
      const cur = map.get(e.worker_name) ?? { operational: 0, manager: 0 };
      if (e.role === "manager") cur.manager += e.hours;
      else cur.operational += e.hours;
      map.set(e.worker_name, cur);
    }
    return Array.from(map.entries())
      .map(([name, totals]) => ({ name, ...totals, total: totals.operational + totals.manager }))
      .sort((a, b) => b.total - a.total);
  }, [entries]);

  const totalAllHours = summary.reduce((s, r) => s + r.total, 0);
  const activeFarm = farms.find((f) => f.id === activeFarmId);
  const inp = "w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Shamba Farm Manager</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Work hours</h1>
              {activeFarm && <p className="mt-1 text-sm text-zinc-500">{activeFarm.name}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {farms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFarmId(f.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeFarmId === f.id ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {f.name}
                </button>
              ))}
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

        {/* Controls */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <div className="flex rounded-full border border-zinc-200 p-0.5">
              <button onClick={() => setTab("log")} className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${tab === "log" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>Log</button>
              <button onClick={() => setTab("summary")} className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${tab === "summary" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>Summary</button>
            </div>
            {tab === "log" && (
              <div className="flex rounded-full border border-zinc-200 p-0.5">
                {(["all", "operational", "manager"] as const).map((r) => (
                  <button key={r} onClick={() => setRoleFilter(r)} className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${roleFilter === r ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>{r}</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setQuickMode(!quickMode)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${quickMode ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"}`}
            >
              Quick add day
            </button>
            <button
              onClick={() => { setForm(blankForm); setModal("new"); }}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              + Add entry
            </button>
          </div>
        </div>

        {/* Quick add form — log an entire day's work for multiple people at once */}
        {quickMode && (
          <div className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold">Log a day</h2>
            <p className="mt-1 text-sm text-zinc-500">Add a line per person with their hours and what they did, then save once.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Date</label>
                <input type="date" className={inp} value={quickDate} onChange={(e) => setQuickDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Role</label>
                <select className={inp} value={quickRole} onChange={(e) => setQuickRole(e.target.value)}>
                  <option value="operational">Operational</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {quickRows.map((row, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 rounded-2xl border border-zinc-100 bg-zinc-50 p-3 sm:grid-cols-[1fr_100px_2fr_auto] sm:items-start">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600 sm:hidden">Worker</label>
                    <input
                      className={inp}
                      list="quick-row-workers"
                      value={row.worker_name}
                      onChange={(e) => updateQuickRow(i, { worker_name: e.target.value })}
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600 sm:hidden">Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className={inp}
                      placeholder="Hours"
                      value={row.hours}
                      onChange={(e) => updateQuickRow(i, { hours: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600 sm:hidden">Description</label>
                    <input
                      className={inp}
                      value={row.notes}
                      onChange={(e) => updateQuickRow(i, { notes: e.target.value })}
                      placeholder="What did they do…"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuickRow(i)}
                    disabled={quickRows.length === 1}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <datalist id="quick-row-workers">
                {WORKERS.map((w) => <option key={w} value={w} />)}
              </datalist>
            </div>

            <button
              type="button"
              onClick={addQuickRow}
              className="mt-3 rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
            >
              + Add person
            </button>

            <div>
              <button
                onClick={handleQuickSave}
                disabled={quickSaving || !quickDate}
                className="mt-4 rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {quickSaving ? "Saving..." : "Save day"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">Loading...</div>
        ) : tab === "summary" ? (
          /* ── Summary view ── */
          <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <th className="px-4 py-3 text-left">Worker</th>
                    <th className="px-4 py-3 text-right">Operational</th>
                    <th className="px-4 py-3 text-right">Manager</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={row.name} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-right text-zinc-600">{row.operational || "—"}</td>
                      <td className="px-4 py-3 text-right text-zinc-600">{row.manager || "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{row.total}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 font-semibold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">{summary.reduce((s, r) => s + r.operational, 0)}</td>
                    <td className="px-4 py-3 text-right">{summary.reduce((s, r) => s + r.manager, 0)}</td>
                    <td className="px-4 py-3 text-right">{totalAllHours}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-center text-sm text-zinc-500">
            No work hours logged yet.
          </div>
        ) : (
          /* ── Log view ── */
          <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Worker</th>
                    <th className="px-4 py-3 text-right">Hours</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-700">{fmt(row.date)}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{row.worker_name}</td>
                      <td className="px-4 py-3 text-right font-semibold">{row.hours}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.role === "manager" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                        }`}>{row.role}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 max-w-[250px]">{row.notes ?? <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(row)} className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100">Edit</button>
                          <button onClick={() => handleDelete(row.id)} disabled={deletingId === row.id} className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
                            {deletingId === row.id ? "…" : "Del"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Single entry modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-semibold">
              {modal === "new" ? "Log hours" : `Edit — ${(modal as WorkHoursEntry).worker_name}`}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Date</label>
                  <input type="date" className={inp} value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Worker</label>
                  <input className={inp} list="workers" value={form.worker_name} onChange={(e) => setForm((p) => ({ ...p, worker_name: e.target.value }))} placeholder="Name" />
                  <datalist id="workers">
                    {WORKERS.map((w) => <option key={w} value={w} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Hours</label>
                  <input type="number" step="0.5" min="0" className={inp} value={form.hours} onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Role</label>
                  <select className={inp} value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                    <option value="operational">Operational</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Notes</label>
                <textarea className={`${inp} min-h-[60px]`} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="What was done…" />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={handleSave} disabled={saving || !form.worker_name.trim() || !form.hours} className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setModal(null)} className="rounded-2xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
