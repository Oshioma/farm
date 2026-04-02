"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sprout } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFarms, getCompanionPlanting } from "@/lib/farm";
import type { Farm, CompanionEntry } from "@/lib/farm";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

const blank = {
  vegetable_type: "",
  variety: "",
  num_seeds: "",
  date: "",
  companion: "",
  notes: "",
};

export default function CompanionPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [entries, setEntries] = useState<CompanionEntry[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(blank);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const router = useRouter();

  async function loadEntries(farmId: string) {
    const rows = await getCompanionPlanting(farmId);
    setEntries(rows);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarmId || !form.vegetable_type.trim()) return;
    setSaving(true);
    setError("");
    try {
      const { error: err } = await supabase.from("companion_planting").insert({
        farm_id: activeFarmId,
        vegetable_type: form.vegetable_type.trim(),
        variety: form.variety.trim() || null,
        num_seeds: form.num_seeds.trim() || null,
        date: form.date || null,
        companion: form.companion.trim() || null,
        notes: form.notes.trim() || null,
      });
      if (err) throw err;
      setForm(blank);
      setShowForm(false);
      await loadEntries(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id: string) {
    setSavingEditId(id);
    setError("");
    try {
      const { error: err } = await supabase
        .from("companion_planting")
        .update({
          vegetable_type: editForm.vegetable_type.trim(),
          variety: editForm.variety.trim() || null,
          num_seeds: editForm.num_seeds.trim() || null,
          date: editForm.date || null,
          companion: editForm.companion.trim() || null,
          notes: editForm.notes.trim() || null,
        })
        .eq("id", id);
      if (err) throw err;
      setEditingId(null);
      await loadEntries(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to update"));
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error: err } = await supabase.from("companion_planting").delete().eq("id", id);
    if (err) setError(errMsg(err, "Failed to delete"));
    else setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  }

  function fmt(d: string | null) {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
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
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Companion planting</h1>
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

        {/* Add entry */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm((v) => !v)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              showForm
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <Sprout size={15} />
            Add entry
          </button>

          {showForm && (
            <div className="mt-4 max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">New planting</h2>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Vegetable type</label>
                    <input
                      type="text"
                      value={form.vegetable_type}
                      onChange={(e) => setForm((p) => ({ ...p, vegetable_type: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      placeholder="Sweet corn"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Variety</label>
                    <input
                      type="text"
                      value={form.variety}
                      onChange={(e) => setForm((p) => ({ ...p, variety: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      placeholder="Bicolour"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Number of seeds</label>
                    <input
                      type="text"
                      value={form.num_seeds}
                      onChange={(e) => setForm((p) => ({ ...p, num_seeds: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      placeholder="20, 2 little rows…"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Date</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Companion plants <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.companion}
                    onChange={(e) => setForm((p) => ({ ...p, companion: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="Basil, pak choi, onion…"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Notes <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="Any extra details…"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setForm(blank); }}
                    className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Table */}
        {loading && entries.length === 0 ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <Sprout className="mx-auto mb-3 text-zinc-300" size={32} />
            <p className="text-sm text-zinc-500">No entries yet. Add one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Vegetable type</th>
                  <th className="px-5 py-4">Variety</th>
                  <th className="px-5 py-4">Seeds</th>
                  <th className="px-5 py-4">Companion plants</th>
                  <th className="px-5 py-4">Notes</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  editingId === entry.id ? (
                    <tr key={entry.id} className="border-b border-zinc-100 bg-amber-50/40">
                      <td className="px-3 py-2">
                        <input type="date" value={editForm.date}
                          onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={editForm.vegetable_type}
                          onChange={(e) => setEditForm((p) => ({ ...p, vegetable_type: e.target.value }))}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={editForm.variety}
                          onChange={(e) => setEditForm((p) => ({ ...p, variety: e.target.value }))}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={editForm.num_seeds}
                          onChange={(e) => setEditForm((p) => ({ ...p, num_seeds: e.target.value }))}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={editForm.companion}
                          onChange={(e) => setEditForm((p) => ({ ...p, companion: e.target.value }))}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={editForm.notes}
                          onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(entry.id)}
                            disabled={savingEditId === entry.id}
                            className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                          >
                            {savingEditId === entry.id ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={entry.id}
                      className={`border-b border-zinc-100 last:border-0 ${i % 2 === 0 ? "" : "bg-zinc-50/50"}`}
                    >
                      <td className="px-5 py-4 tabular-nums text-zinc-600">{fmt(entry.date)}</td>
                      <td className="px-5 py-4 font-medium">{entry.vegetable_type}</td>
                      <td className="px-5 py-4 text-zinc-600">{entry.variety ?? "—"}</td>
                      <td className="px-5 py-4 text-zinc-600">{entry.num_seeds ?? "—"}</td>
                      <td className="px-5 py-4 text-zinc-600">{entry.companion ?? "—"}</td>
                      <td className="px-5 py-4 text-zinc-500">{entry.notes ?? "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(entry.id);
                              setEditForm({
                                vegetable_type: entry.vegetable_type,
                                variety: entry.variety ?? "",
                                num_seeds: entry.num_seeds ?? "",
                                date: entry.date ?? "",
                                companion: entry.companion ?? "",
                                notes: entry.notes ?? "",
                              });
                            }}
                            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                            className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
