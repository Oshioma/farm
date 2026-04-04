"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms, getCompost, getZones } from "@/lib/farm";
import type { Farm, CompostEntry, Zone } from "@/lib/farm";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

const blankForm = { compost_type: "", date: "", ready_to_use_date: "", materials_used: "", place: "", zone_id: "", notes: "" };

function fmt(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function CompostPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [entries, setEntries] = useState<CompostEntry[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<CompostEntry | null | "new">(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function loadEntries(farmId: string) {
    const [rows, zoneRows] = await Promise.all([getCompost(farmId), getZones(farmId)]);
    setEntries(rows);
    setZones(zoneRows);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const farmRows = await getFarms();
        setFarms(farmRows);
        if (farmRows.length > 0) {
          setActiveFarmId(farmRows[0].id);
          await loadEntries(farmRows[0].id);
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
    loadEntries(activeFarmId)
      .catch((err) => setError(errMsg(err, "Failed to load")))
      .finally(() => setLoading(false));
  }, [activeFarmId]);

  async function handleSave() {
    if (!activeFarmId) return;
    try {
      setSaving(true);
      setError("");
      const payload = {
        farm_id: activeFarmId,
        compost_type: form.compost_type.trim() || null,
        date: form.date || null,
        ready_to_use_date: form.ready_to_use_date || null,
        materials_used: form.materials_used.trim() || null,
        place: form.place.trim() || null,
        zone_id: form.zone_id || null,
        notes: form.notes.trim() || null,
      };
      if (modal === "new") {
        const { error: e } = await supabase.from("compost").insert(payload);
        if (e) throw e;
      } else if (modal) {
        const { error: e } = await supabase.from("compost").update(payload).eq("id", (modal as CompostEntry).id);
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

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);
      const { error: e } = await supabase.from("compost").delete().eq("id", id);
      if (e) throw e;
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(errMsg(err, "Failed to delete"));
    } finally {
      setDeletingId(null);
    }
  }

  function openEdit(entry: CompostEntry) {
    setForm({
      compost_type: entry.compost_type ?? "",
      date: entry.date ?? "",
      ready_to_use_date: entry.ready_to_use_date ?? "",
      materials_used: entry.materials_used ?? "",
      place: entry.place ?? "",
      zone_id: entry.zone_id ?? "",
      notes: entry.notes ?? "",
    });
    setModal(entry);
  }

  function openAdd() {
    setForm(blankForm);
    setModal("new");
  }

  const activeFarm = farms.find((f) => f.id === activeFarmId);

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Compost register</h1>
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

        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500">{entries.length} entries</span>
          <button
            onClick={openAdd}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            + Add compost
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-center text-sm text-zinc-500">
            No compost entries yet.
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Started</th>
                    <th className="px-4 py-3 text-left">Ready to use</th>
                    <th className="px-4 py-3 text-left">Materials</th>
                    <th className="px-4 py-3 text-left">Place</th>
                    <th className="px-4 py-3 text-left">Zone / Bed</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row) => (
                    <tr key={row.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 align-top transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{row.compost_type ?? <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-700">{fmt(row.date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-700">{fmt(row.ready_to_use_date)}</td>
                      <td className="px-4 py-3 text-zinc-600">{row.materials_used ?? <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{row.place ?? <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{row.zone?.[0]?.name ?? <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-3 text-zinc-500 max-w-[180px]">{row.notes ?? <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(row)} className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100">Edit</button>
                          <button onClick={() => handleDelete(row.id)} disabled={deletingId === row.id} className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
                            {deletingId === row.id ? "…" : "Delete"}
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

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-semibold">
              {modal === "new" ? "Add compost entry" : `Edit — ${(modal as CompostEntry).compost_type ?? "entry"}`}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Compost type</label>
                  <input className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.compost_type} onChange={(e) => setForm((p) => ({ ...p, compost_type: e.target.value }))} placeholder="Horse manure, Bokashi…" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Place</label>
                  <input className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.place} onChange={(e) => setForm((p) => ({ ...p, place: e.target.value }))} placeholder="Next to the fence" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Date started</label>
                  <input type="date" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Ready to use</label>
                  <input type="date" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.ready_to_use_date} onChange={(e) => setForm((p) => ({ ...p, ready_to_use_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Materials used</label>
                <input className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.materials_used} onChange={(e) => setForm((p) => ({ ...p, materials_used: e.target.value }))} placeholder="Manure + food scraps" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Zone / Bed <span className="font-normal text-zinc-400">(optional)</span></label>
                <select className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.zone_id} onChange={(e) => setForm((p) => ({ ...p, zone_id: e.target.value }))}>
                  <option value="">—</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Notes</label>
                <textarea className="min-h-[70px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={handleSave} disabled={saving} className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setModal(null)} className="rounded-2xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
