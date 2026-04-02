"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms, getPlantingPlan } from "@/lib/farm";
import type { Farm, PlantingPlanEntry } from "@/lib/farm";

/* ── Types ────────────────────────────────────────────────── */

type FormData = {
  species_name: string;
  category: string;
  strata: string;
  role: string;
  seedlings_to_start: string;
  target_count: string;
  propagation_method: string;
  notes: string;
};

const blank = (category: string): FormData => ({
  species_name: "",
  category,
  strata: "",
  role: "",
  seedlings_to_start: "",
  target_count: "",
  propagation_method: "",
  notes: "",
});

function entryToForm(e: PlantingPlanEntry): FormData {
  return {
    species_name: e.species_name,
    category: e.category,
    strata: e.strata ?? "",
    role: e.role ?? "",
    seedlings_to_start: e.seedlings_to_start?.toString() ?? "",
    target_count: e.target_count ?? "",
    propagation_method: e.propagation_method ?? "",
    notes: e.notes ?? "",
  };
}

/* ── Page ─────────────────────────────────────────────────── */

export default function PlantingPlanPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState<string>("");
  const [entries, setEntries] = useState<PlantingPlanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"tree" | "support">("tree");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // CRUD state
  const [modalEntry, setModalEntry] = useState<PlantingPlanEntry | null | "new">(null);
  const [form, setForm] = useState<FormData>(blank("tree"));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const farmRows = await getFarms();
        setFarms(farmRows);
        const topLand = farmRows.find((f) => /top land/i.test(f.name)) ?? farmRows[0];
        if (topLand) setActiveFarmId(topLand.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load farms");
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    setLoading(true);
    setError("");
    getPlantingPlan(activeFarmId)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load planting plan"))
      .finally(() => setLoading(false));
  }, [activeFarmId]);

  async function reload() {
    if (!activeFarmId) return;
    const updated = await getPlantingPlan(activeFarmId);
    setEntries(updated);
  }

  function openAdd() {
    setForm(blank(tab));
    setModalEntry("new");
  }

  function openEdit(entry: PlantingPlanEntry) {
    setForm(entryToForm(entry));
    setModalEntry(entry);
  }

  function closeModal() {
    setModalEntry(null);
    setSaving(false);
  }

  async function handleSave() {
    if (!activeFarmId || !form.species_name.trim()) return;
    try {
      setSaving(true);
      setError("");
      const payload = {
        farm_id: activeFarmId,
        species_name: form.species_name.trim(),
        category: form.category,
        strata: form.strata.trim() || null,
        role: form.role.trim() || null,
        seedlings_to_start: form.seedlings_to_start ? parseInt(form.seedlings_to_start) : null,
        target_count: form.target_count.trim() || null,
        propagation_method: form.propagation_method.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (modalEntry === "new") {
        const { error: e } = await supabase.from("planting_plan").insert(payload);
        if (e) throw e;
      } else if (modalEntry) {
        const { error: e } = await supabase.from("planting_plan").update(payload).eq("id", modalEntry.id);
        if (e) throw e;
      }

      await reload();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);
      setError("");
      const { error: e } = await supabase.from("planting_plan").delete().eq("id", id);
      if (e) throw e;
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const trees = entries.filter((e) => e.category === "tree");
  const support = entries.filter((e) => e.category === "support");
  const activeFarm = farms.find((f) => f.id === activeFarmId);

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Syntropic Planting Plan</h1>
              {activeFarm && <p className="mt-1 text-sm text-zinc-500">{activeFarm.name}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {farms.map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => setActiveFarmId(farm.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    farm.id === activeFarmId
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {farm.name}
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
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Tabs + Add button */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {(["tree", "support"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  tab === t ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {t === "tree" ? "Trees & Fruiting plants" : "Support species"}
                <span className="ml-2 text-xs opacity-60">
                  {t === "tree" ? trees.length : support.length}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={openAdd}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            + Add entry
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">Loading...</div>
        ) : tab === "tree" ? (
          <TreesTable trees={trees} expandedId={expandedId} setExpandedId={setExpandedId} onEdit={openEdit} onDelete={handleDelete} deletingId={deletingId} />
        ) : (
          <SupportCards support={support} expandedId={expandedId} setExpandedId={setExpandedId} onEdit={openEdit} onDelete={handleDelete} deletingId={deletingId} />
        )}
      </div>

      {/* Modal */}
      {modalEntry !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-5">
              {modalEntry === "new" ? "Add entry" : `Edit — ${(modalEntry as PlantingPlanEntry).species_name}`}
            </h2>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <Field label="Species name *">
                <input className={input} value={form.species_name} onChange={(e) => setForm((p) => ({ ...p, species_name: e.target.value }))} placeholder="Coconut" />
              </Field>
              <Field label="Category">
                <select className={input} value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                  <option value="tree">Tree / Fruiting plant</option>
                  <option value="support">Support species</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Strata / Height">
                  <input className={input} value={form.strata} onChange={(e) => setForm((p) => ({ ...p, strata: e.target.value }))} placeholder="Medium / 3m–5m" />
                </Field>
                <Field label="Role">
                  <input className={input} value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} placeholder="Cash crop" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Seedlings to start">
                  <input className={input} type="number" min="0" value={form.seedlings_to_start} onChange={(e) => setForm((p) => ({ ...p, seedlings_to_start: e.target.value }))} placeholder="32" />
                </Field>
                <Field label="Target count">
                  <input className={input} value={form.target_count} onChange={(e) => setForm((p) => ({ ...p, target_count: e.target.value }))} placeholder="25 or 8 + 10 temporary" />
                </Field>
              </div>
              <Field label="Propagation method">
                <input className={input} value={form.propagation_method} onChange={(e) => setForm((p) => ({ ...p, propagation_method: e.target.value }))} placeholder="Grafted rootstock" />
              </Field>
              <Field label="Notes">
                <textarea className={`${input} min-h-[100px]`} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Management notes, spacing, timing..." />
              </Field>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.species_name.trim()}
                className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={closeModal}
                className="rounded-2xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ── Shared helpers ───────────────────────────────────────── */

const input = "w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-600">{label}</label>
      {children}
    </div>
  );
}

function strataColor(strata: string | null) {
  if (!strata) return "bg-zinc-100 text-zinc-600";
  const s = strata.toLowerCase();
  if (s.includes("emergent")) return "bg-purple-100 text-purple-700";
  if (s.includes("high") || s.includes("pioneer")) return "bg-blue-100 text-blue-700";
  if (s.includes("medium")) return "bg-emerald-100 text-emerald-700";
  return "bg-zinc-100 text-zinc-600";
}

function roleColor(role: string | null) {
  if (!role) return "bg-zinc-100 text-zinc-600";
  const r = role.toLowerCase();
  if (r.includes("legacy")) return "bg-amber-100 text-amber-700";
  if (r.includes("quick cash")) return "bg-green-100 text-green-700";
  if (r.includes("cash")) return "bg-teal-100 text-teal-700";
  if (r.includes("support") || r.includes("biomass")) return "bg-stone-100 text-stone-600";
  return "bg-zinc-100 text-zinc-600";
}

/* ── Trees table ─────────────────────────────────────────── */

function TreesTable({
  trees, expandedId, setExpandedId, onEdit, onDelete, deletingId,
}: {
  trees: PlantingPlanEntry[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onEdit: (entry: PlantingPlanEntry) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (trees.length === 0) {
    return <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">No trees added yet.</div>;
  }
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <th className="px-4 py-3 text-left">Species</th>
              <th className="px-4 py-3 text-left">Strata / Height</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-right">Seedlings</th>
              <th className="px-4 py-3 text-right">Target</th>
              <th className="px-4 py-3 text-left">Propagation</th>
              <th className="px-4 py-3 text-left">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {trees.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const isDeleting = deletingId === entry.id;
              return (
                <tr
                  key={entry.id}
                  className={`border-b border-zinc-100 last:border-b-0 align-top ${isExpanded ? "bg-stone-50" : "hover:bg-zinc-50"} transition-colors`}
                >
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{entry.species_name}</td>
                  <td className="px-4 py-3">
                    {entry.strata
                      ? <span className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${strataColor(entry.strata)}`}>{entry.strata}</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {entry.role
                      ? <span className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${roleColor(entry.role)}`}>{entry.role}</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{entry.seedlings_to_start ?? <span className="text-zinc-300">—</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{entry.target_count ?? <span className="text-zinc-300">—</span>}</td>
                  <td className="px-4 py-3 text-zinc-600">{entry.propagation_method ?? <span className="text-zinc-300">—</span>}</td>
                  <td
                    className="px-4 py-3 text-zinc-500 max-w-[220px] cursor-pointer"
                    onClick={() => entry.notes && setExpandedId(isExpanded ? null : entry.id)}
                  >
                    {entry.notes
                      ? <span className={isExpanded ? "" : "line-clamp-2"}>{entry.notes}</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEdit(entry)}
                        className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(entry.id)}
                        disabled={isDeleting}
                        className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        {isDeleting ? "…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Support species cards ───────────────────────────────── */

function SupportCards({
  support, expandedId, setExpandedId, onEdit, onDelete, deletingId,
}: {
  support: PlantingPlanEntry[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onEdit: (entry: PlantingPlanEntry) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (support.length === 0) {
    return <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">No support species added yet.</div>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {support.map((entry) => {
        const isExpanded = expandedId === entry.id;
        const isDeleting = deletingId === entry.id;
        return (
          <div key={entry.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{entry.species_name}</h3>
                {entry.strata && (
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${strataColor(entry.strata)}`}>
                    {entry.strata}
                  </span>
                )}
              </div>
              {entry.role && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${roleColor(entry.role)}`}>
                  {entry.role}
                </span>
              )}
            </div>

            {entry.propagation_method && (
              <p className="mt-3 text-xs text-zinc-500">
                <span className="font-medium text-zinc-700">Propagation: </span>
                {entry.propagation_method}
              </p>
            )}

            {entry.notes && (
              <>
                <p className={`mt-3 text-sm text-zinc-600 leading-relaxed ${!isExpanded ? "line-clamp-3" : ""}`}>
                  {entry.notes}
                </p>
                {entry.notes.length > 120 && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="mt-2 text-xs font-medium text-zinc-400 hover:text-zinc-700 transition text-left"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </>
            )}

            <div className="mt-4 flex gap-2 pt-3 border-t border-zinc-100">
              <button
                onClick={() => onEdit(entry)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                disabled={isDeleting}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
