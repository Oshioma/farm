"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms, getTreeRegistry } from "@/lib/farm";
import type { Farm, TreeEntry } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";

type FormData = {
  tree_name: string;
  number_of_trees: string;
  date_planted: string;
  notes: string;
};

const blank: FormData = { tree_name: "", number_of_trees: "", date_planted: "", notes: "" };

function entryToForm(e: TreeEntry): FormData {
  return {
    tree_name: e.tree_name,
    number_of_trees: e.number_of_trees?.toString() ?? "",
    date_planted: e.date_planted ?? "",
    notes: e.notes ?? "",
  };
}

function fmt(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function errMsg(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function TreeRegistryPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [trees, setTrees] = useState<TreeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalEntry, setModalEntry] = useState<TreeEntry | "new" | null>(null);
  const [form, setForm] = useState<FormData>(blank);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const router = useRouter();
  useFarmSelection({
    farms,
    activeFarmId,
    setActiveFarmId,
    preferredFarmName: "top land",
  });

  async function load(farmId: string) {
    const rows = await getTreeRegistry(farmId);
    setTrees(rows);
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
    load(activeFarmId).catch((err) => setError(errMsg(err, "Failed to load trees")));
  }, [activeFarmId]);

  function openAdd() {
    setModalEntry("new");
    setForm(blank);
    setShowModal(true);
  }

  function openEdit(entry: TreeEntry) {
    setModalEntry(entry);
    setForm(entryToForm(entry));
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setModalEntry(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarmId || !form.tree_name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        farm_id: activeFarmId,
        tree_name: form.tree_name.trim(),
        number_of_trees: form.number_of_trees ? Number(form.number_of_trees) : null,
        date_planted: form.date_planted || null,
        notes: form.notes.trim() || null,
      };
      if (modalEntry === "new") {
        const { error: err } = await supabase.from("tree_registry").insert(payload);
        if (err) throw err;
      } else if (modalEntry) {
        const { error: err } = await supabase.from("tree_registry").update(payload).eq("id", modalEntry.id);
        if (err) throw err;
      }
      await load(activeFarmId);
      closeModal();
    } catch (err) {
      setError(errMsg(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError("");
    try {
      const { error: err } = await supabase.from("tree_registry").delete().eq("id", id);
      if (err) throw err;
      await load(activeFarmId);
      setConfirmDeleteId(null);
    } catch (err) {
      setError(errMsg(err, "Failed to delete"));
    } finally {
      setDeletingId(null);
    }
  }

  const activeFarm = farms.find((f) => f.id === activeFarmId);
  const totalTrees = trees.reduce((sum, t) => sum + (t.number_of_trees ?? 0), 0);

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tree registry</h1>
              {activeFarm && (
                <p className="mt-1 text-sm text-zinc-500">{activeFarm.name}</p>
              )}
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
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
            Loading…
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Trees planted</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {trees.length} species · {totalTrees} trees total
                </p>
              </div>
              <button
                onClick={openAdd}
                className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                + Add tree
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <th className="pb-3 pr-4">Tree</th>
                    <th className="pb-3 pr-4 text-right"># Trees</th>
                    <th className="pb-3 pr-4">Date planted</th>
                    <th className="pb-3 pr-4">Notes</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {trees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-400">
                        No trees recorded yet.
                      </td>
                    </tr>
                  ) : (
                    trees.map((tree) => (
                      <tr key={tree.id} className="border-b border-zinc-100 last:border-0">
                        <td className="py-3 pr-4 font-medium">{tree.tree_name}</td>
                        <td className="py-3 pr-4 text-right font-semibold tabular-nums">
                          {tree.number_of_trees ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-zinc-500">{fmt(tree.date_planted)}</td>
                        <td className="py-3 pr-4 max-w-xs text-zinc-500">
                          {tree.notes ? (
                            <span title={tree.notes} className="line-clamp-2">{tree.notes}</span>
                          ) : "—"}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {confirmDeleteId === tree.id ? (
                              <>
                                <span className="text-xs text-red-600">Sure?</span>
                                <button
                                  onClick={() => handleDelete(tree.id)}
                                  disabled={deletingId === tree.id}
                                  className="rounded-xl bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  {deletingId === tree.id ? "Deleting…" : "Yes"}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded-xl border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => openEdit(tree)}
                                  className="rounded-xl border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(tree.id)}
                                  className="rounded-xl border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-semibold">
              {modalEntry === "new" ? "Add tree" : "Edit tree"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Tree name</label>
                <input
                  type="text"
                  value={form.tree_name}
                  onChange={(e) => setForm((p) => ({ ...p, tree_name: e.target.value }))}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                  placeholder="Avocado"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Number of trees</label>
                  <input
                    type="number"
                    min="0"
                    value={form.number_of_trees}
                    onChange={(e) => setForm((p) => ({ ...p, number_of_trees: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="7"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Date planted</label>
                  <input
                    type="date"
                    value={form.date_planted}
                    onChange={(e) => setForm((p) => ({ ...p, date_planted: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                  placeholder="Planting method, protection, conditions…"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving || !form.tree_name.trim()}
                  className="flex-1 rounded-2xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {saving ? "Saving…" : modalEntry === "new" ? "Add tree" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-2xl border border-zinc-300 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
