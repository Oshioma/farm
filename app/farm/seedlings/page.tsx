"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms, getSeedlings, getSeedCollection } from "@/lib/farm";
import type { Farm, SeedlingEntry, SeedCollectionEntry } from "@/lib/farm";
import { SeedlingMap } from "../components/SeedlingMap";

/* ── Types ────────────────────────────────────────────────── */

type FormData = {
  type: string;
  date: string;
  plant: string;
  variety: string;
  quantity: string;
  germination: string;
  germination_date: string;
  healthy_seedlings: string;
  successional_sowing: string;
  yields: string;
  row_location: string;
  notes: string;
};

const blank = (type: string): FormData => ({
  type,
  date: "",
  plant: "",
  variety: "",
  quantity: "",
  germination: "",
  germination_date: "",
  healthy_seedlings: "",
  successional_sowing: "",
  yields: "",
  row_location: "",
  notes: "",
});

function entryToForm(e: SeedlingEntry): FormData {
  return {
    type: e.type,
    date: e.date ?? "",
    plant: e.plant,
    variety: e.variety ?? "",
    quantity: e.quantity ?? "",
    germination: e.germination ?? "",
    germination_date: e.germination_date ?? "",
    healthy_seedlings: e.healthy_seedlings ?? "",
    successional_sowing: e.successional_sowing ?? "",
    yields: e.yields ?? "",
    row_location: e.row_location ?? "",
    notes: e.notes ?? "",
  };
}

function fmt(date: string | null) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/* ── Page ─────────────────────────────────────────────────── */

export default function SeedlingsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [entries, setEntries] = useState<SeedlingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"nursery" | "field" | "seeds" | "map">("nursery");

  const [modal, setModal] = useState<SeedlingEntry | null | "new">(null);
  const [form, setForm] = useState<FormData>(blank("nursery"));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Seed collection
  const [seedEntries, setSeedEntries] = useState<SeedCollectionEntry[]>([]);
  const [seedModal, setSeedModal] = useState<SeedCollectionEntry | null | "new">(null);
  const [seedForm, setSeedForm] = useState({ plant: "", distance: "", notes: "", notes2: "" });
  const [seedSaving, setSeedSaving] = useState(false);
  const [seedDeletingId, setSeedDeletingId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    getFarms()
      .then((rows) => {
        setFarms(rows);
        const topLand = rows.find((f) => /top land/i.test(f.name)) ?? rows[0];
        if (topLand) setActiveFarmId(topLand.id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load farms"));
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    setLoading(true);
    setError("");
    Promise.all([getSeedlings(activeFarmId), getSeedCollection(activeFarmId)])
      .then(([s, seeds]) => { setEntries(s); setSeedEntries(seeds); })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => setLoading(false));
  }, [activeFarmId]);

  async function reload() {
    if (!activeFarmId) return;
    const [s, seeds] = await Promise.all([getSeedlings(activeFarmId), getSeedCollection(activeFarmId)]);
    setEntries(s); setSeedEntries(seeds);
  }

  function openAdd() {
    if (tab === "seeds") {
      setSeedForm({ plant: "", distance: "", notes: "", notes2: "" });
      setSeedModal("new");
    } else {
      setForm(blank(tab));
      setModal("new");
    }
  }

  function openEdit(entry: SeedlingEntry) {
    setForm(entryToForm(entry));
    setModal(entry);
  }

  async function handleSave() {
    if (!activeFarmId || !form.plant.trim()) return;
    try {
      setSaving(true);
      setError("");
      const payload = {
        farm_id: activeFarmId,
        type: form.type,
        date: form.date || null,
        plant: form.plant.trim(),
        variety: form.variety.trim() || null,
        quantity: form.quantity.trim() || null,
        germination: form.germination.trim() || null,
        germination_date: form.germination_date || null,
        healthy_seedlings: form.healthy_seedlings.trim() || null,
        successional_sowing: form.successional_sowing.trim() || null,
        yields: form.yields.trim() || null,
        row_location: form.row_location.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (modal === "new") {
        const { error: e } = await supabase.from("seedlings").insert(payload);
        if (e) throw e;
      } else if (modal) {
        const { error: e } = await supabase.from("seedlings").update(payload).eq("id", (modal as SeedlingEntry).id);
        if (e) throw e;
      }

      await reload();
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);
      const { error: e } = await supabase.from("seedlings").delete().eq("id", id);
      if (e) throw e;
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSeedSave() {
    if (!activeFarmId || !seedForm.plant.trim()) return;
    try {
      setSeedSaving(true);
      setError("");
      const payload = {
        farm_id: activeFarmId,
        plant: seedForm.plant.trim(),
        distance: seedForm.distance.trim() || null,
        notes: seedForm.notes.trim() || null,
        notes2: seedForm.notes2.trim() || null,
      };
      if (seedModal === "new") {
        const { error: e } = await supabase.from("seed_collection").insert(payload);
        if (e) throw e;
      } else if (seedModal) {
        const { error: e } = await supabase.from("seed_collection").update(payload).eq("id", (seedModal as SeedCollectionEntry).id);
        if (e) throw e;
      }
      await reload();
      setSeedModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSeedSaving(false);
    }
  }

  async function handleSeedDelete(id: string) {
    try {
      setSeedDeletingId(id);
      const { error: e } = await supabase.from("seed_collection").delete().eq("id", id);
      if (e) throw e;
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSeedDeletingId(null);
    }
  }

  const nursery = entries.filter((e) => e.type === "nursery");
  const field = entries.filter((e) => e.type === "field");
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
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Seedlings</h1>
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

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {([
              { key: "nursery", label: "Nursery starts", count: nursery.length },
              { key: "field",   label: "Field plantings", count: field.length },
              { key: "seeds", label: "Seed collection", count: seedEntries.length },
              { key: "map", label: "Map", count: null },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  tab === key ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {label}
                {count !== null && <span className="ml-2 text-xs opacity-60">{count}</span>}
              </button>
            ))}
          </div>
          {tab !== "map" && (
            <button
              onClick={openAdd}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              + Add entry
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">Loading...</div>
        ) : tab === "nursery" ? (
          <SeedlingTable
            rows={nursery}
            columns={["date", "plant", "variety", "quantity", "successional_sowing", "germination_date", "germination", "healthy_seedlings", "notes", "yields"]}
            headers={["Date", "Plant", "Variety", "Seeds", "Successional", "Germ. date", "Status", "Healthy", "Notes", "Yields"]}
            onEdit={openEdit}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        ) : tab === "field" ? (
          <SeedlingTable
            rows={field}
            columns={["date", "row_location", "plant", "quantity", "germination_date", "germination", "healthy_seedlings", "notes"]}
            headers={["Date", "Row", "Plant", "Qty", "Germ. date", "Status", "Healthy", "Notes"]}
            onEdit={openEdit}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        ) : tab === "seeds" ? (
          <SeedCollectionTable
            rows={seedEntries}
            onEdit={(e) => { setSeedForm({ plant: e.plant, distance: e.distance ?? "", notes: e.notes ?? "", notes2: e.notes2 ?? "" }); setSeedModal(e); }}
            onDelete={handleSeedDelete}
            deletingId={seedDeletingId}
          />
        ) : tab === "map" ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
            <SeedlingMap
              seedlings={entries}
              farmName={activeFarm?.name}
              farmId={activeFarmId}
            />
          </div>
        ) : null}
      </div>

      {/* Seedling modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-semibold">
              {modal === "new" ? "Add entry" : `Edit — ${(modal as SeedlingEntry).plant}`}
            </h2>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              <Field label="Type">
                <select className={inp} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  <option value="nursery">Nursery start</option>
                  <option value="field">Field planting</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <input type="date" className={inp} value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                </Field>
                <Field label="Plant *">
                  <input className={inp} value={form.plant} onChange={(e) => setForm((p) => ({ ...p, plant: e.target.value }))} placeholder="Tomato" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Variety">
                  <input className={inp} value={form.variety} onChange={(e) => setForm((p) => ({ ...p, variety: e.target.value }))} placeholder="Fiorentino" />
                </Field>
                <Field label="Quantity">
                  <input className={inp} value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} placeholder="64 or ~20" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Successional sowing">
                  <input className={inp} value={form.successional_sowing} onChange={(e) => setForm((p) => ({ ...p, successional_sowing: e.target.value }))} placeholder="After seed collection, monthly…" />
                </Field>
                <Field label="Germination date">
                  <input type="date" className={inp} value={form.germination_date} onChange={(e) => setForm((p) => ({ ...p, germination_date: e.target.value }))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Healthy seedlings">
                  <input className={inp} value={form.healthy_seedlings} onChange={(e) => setForm((p) => ({ ...p, healthy_seedlings: e.target.value }))} placeholder="8, All, None…" />
                </Field>
                {form.type === "field" && (
                  <Field label="Row / Location">
                    <input className={inp} value={form.row_location} onChange={(e) => setForm((p) => ({ ...p, row_location: e.target.value }))} placeholder="A1, South border…" />
                  </Field>
                )}
              </div>
              <Field label="Germination status">
                <div className="flex gap-3 pt-1">
                  {[
                    { value: "green",  bg: "bg-emerald-500", ring: "ring-emerald-500", label: "Good" },
                    { value: "amber",  bg: "bg-amber-400",   ring: "ring-amber-400",   label: "Partial" },
                    { value: "red",    bg: "bg-rose-500",    ring: "ring-rose-500",    label: "Failed" },
                  ].map(({ value, bg, ring, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, germination: p.germination === value ? "" : value }))}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        form.germination === value
                          ? `border-transparent ${bg} text-white ring-2 ${ring} ring-offset-1`
                          : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${bg}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Notes">
                <textarea className={`${inp} min-h-[80px]`} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Observations…" />
              </Field>
              <Field label="Yields">
                <textarea className={`${inp} min-h-[60px]`} value={form.yields} onChange={(e) => setForm((p) => ({ ...p, yields: e.target.value }))} placeholder="Harvest results…" />
              </Field>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.plant.trim()}
                className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setModal(null)}
                className="rounded-2xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seed collection modal */}
      {seedModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-semibold">
              {seedModal === "new" ? "Add seed entry" : `Edit — ${(seedModal as SeedCollectionEntry).plant}`}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plant *">
                  <input className={inp} value={seedForm.plant} onChange={(e) => setSeedForm((p) => ({ ...p, plant: e.target.value }))} placeholder="Tomatoes" />
                </Field>
                <Field label="Isolation distance">
                  <input className={inp} value={seedForm.distance} onChange={(e) => setSeedForm((p) => ({ ...p, distance: e.target.value }))} placeholder="500 m - 1 km" />
                </Field>
              </div>
              <Field label="Notes">
                <textarea className={`${inp} min-h-[70px]`} value={seedForm.notes} onChange={(e) => setSeedForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Wind direction, bagging…" />
              </Field>
              <Field label="Additional notes">
                <textarea className={`${inp} min-h-[70px]`} value={seedForm.notes2} onChange={(e) => setSeedForm((p) => ({ ...p, notes2: e.target.value }))} placeholder="Harvest tips…" />
              </Field>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={handleSeedSave} disabled={seedSaving || !seedForm.plant.trim()} className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60">
                {seedSaving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setSeedModal(null)} className="rounded-2xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
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

const inp = "w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-600">{label}</label>
      {children}
    </div>
  );
}

type Col = "date" | "plant" | "variety" | "quantity" | "germination" | "germination_date" | "healthy_seedlings" | "successional_sowing" | "yields" | "row_location" | "notes";

function SeedlingTable({
  rows, columns, headers, onEdit, onDelete, deletingId,
}: {
  rows: SeedlingEntry[];
  columns: Col[];
  headers: string[];
  onEdit: (e: SeedlingEntry) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">
        No entries yet. Click + Add entry to get started.
      </div>
    );
  }

  function cell(row: SeedlingEntry, col: Col) {
    if (col === "date") return fmt(row.date);
    if (col === "germination_date") return fmt(row.germination_date);
    if (col === "germination") {
      const g = row.germination;
      if (g === "green") return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Good</span>;
      if (g === "amber") return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-400" />Partial</span>;
      if (g === "red")   return <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700"><span className="h-2 w-2 rounded-full bg-rose-500" />Failed</span>;
      return <span className="text-zinc-300">—</span>;
    }
    const val = row[col as keyof SeedlingEntry];
    if (typeof val === "string") return val;
    return val ?? <span className="text-zinc-300">—</span>;
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: `${columns.length * 130 + 100}px` }}>
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 align-top transition-colors">
                {columns.map((col) => (
                  <td
                    key={col}
                    className={`px-4 py-3 ${col === "notes" ? "max-w-xs text-zinc-500" : col === "plant" ? "font-medium whitespace-nowrap" : "text-zinc-700"}`}
                  >
                    {cell(row, col)}
                  </td>
                ))}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(row)}
                      className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(row.id)}
                      disabled={deletingId === row.id}
                      className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                    >
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
  );
}

/* ── Seed collection table ───────────────────────────────── */

function SeedCollectionTable({
  rows, onEdit, onDelete, deletingId,
}: {
  rows: SeedCollectionEntry[];
  onEdit: (e: SeedCollectionEntry) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">
        No seed collection entries yet. Click + Add entry to get started.
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <th className="px-4 py-3 text-left">Plant</th>
              <th className="px-4 py-3 text-left">Isolation distance</th>
              <th className="px-4 py-3 text-left">Notes</th>
              <th className="px-4 py-3 text-left">Additional notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 align-top transition-colors">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{row.plant}</td>
                <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">{row.distance ?? <span className="text-zinc-300">—</span>}</td>
                <td className="px-4 py-3 text-zinc-600 max-w-[220px]">{row.notes ?? <span className="text-zinc-300">—</span>}</td>
                <td className="px-4 py-3 text-zinc-500 max-w-[200px]">{row.notes2 ?? <span className="text-zinc-300">—</span>}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(row)} className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100">Edit</button>
                    <button onClick={() => onDelete(row.id)} disabled={deletingId === row.id} className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
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
  );
}
