"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms, getSeedlings, getSoilImprovements, getFertilisations } from "@/lib/farm";
import type { Farm, SeedlingEntry, SoilImprovement, FertilisationEntry } from "@/lib/farm";

/* ── Types ────────────────────────────────────────────────── */

type FormData = {
  type: string;
  date: string;
  plant: string;
  variety: string;
  quantity: string;
  germination: string;
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
    row_location: e.row_location ?? "",
    notes: e.notes ?? "",
  };
}

function fmt(date: string | null) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

type SoilFormData = {
  date: string;
  bed: string;
  method: string;
  notes: string;
};

const blankSoil = (): SoilFormData => ({ date: "", bed: "", method: "", notes: "" });

function soilToForm(e: SoilImprovement): SoilFormData {
  return { date: e.date ?? "", bed: e.bed ?? "", method: e.method ?? "", notes: e.notes ?? "" };
}

/* ── Page ─────────────────────────────────────────────────── */

export default function SeedlingsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [entries, setEntries] = useState<SeedlingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"nursery" | "field" | "soil" | "fertilisation">("nursery");

  const [modal, setModal] = useState<SeedlingEntry | null | "new">(null);
  const [form, setForm] = useState<FormData>(blank("nursery"));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Soil improvements
  const [soilEntries, setSoilEntries] = useState<SoilImprovement[]>([]);

  // Fertilisation
  const [fertEntries, setFertEntries] = useState<FertilisationEntry[]>([]);
  const [fertModal, setFertModal] = useState<FertilisationEntry | null | "new">(null);
  const [fertForm, setFertForm] = useState({ date: "", fertiliser: "", plants: "", notes: "" });
  const [fertSaving, setFertSaving] = useState(false);
  const [fertDeletingId, setFertDeletingId] = useState<string | null>(null);
  const [soilModal, setSoilModal] = useState<SoilImprovement | null | "new">(null);
  const [soilForm, setSoilForm] = useState<SoilFormData>(blankSoil());
  const [soilSaving, setSoilSaving] = useState(false);
  const [soilDeletingId, setSoilDeletingId] = useState<string | null>(null);

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
    Promise.all([getSeedlings(activeFarmId), getSoilImprovements(activeFarmId), getFertilisations(activeFarmId)])
      .then(([s, soil, fert]) => { setEntries(s); setSoilEntries(soil); setFertEntries(fert); })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => setLoading(false));
  }, [activeFarmId]);

  async function reload() {
    if (!activeFarmId) return;
    const [s, soil, fert] = await Promise.all([getSeedlings(activeFarmId), getSoilImprovements(activeFarmId), getFertilisations(activeFarmId)]);
    setEntries(s);
    setSoilEntries(soil);
    setFertEntries(fert);
  }

  function openAdd() {
    if (tab === "soil") {
      setSoilForm(blankSoil());
      setSoilModal("new");
    } else if (tab === "fertilisation") {
      setFertForm({ date: "", fertiliser: "", plants: "", notes: "" });
      setFertModal("new");
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

  async function handleSoilSave() {
    if (!activeFarmId) return;
    try {
      setSoilSaving(true);
      setError("");
      const payload = {
        farm_id: activeFarmId,
        date: soilForm.date || null,
        bed: soilForm.bed.trim() || null,
        method: soilForm.method.trim() || null,
        notes: soilForm.notes.trim() || null,
      };
      if (soilModal === "new") {
        const { error: e } = await supabase.from("soil_improvements").insert(payload);
        if (e) throw e;
      } else if (soilModal) {
        const { error: e } = await supabase.from("soil_improvements").update(payload).eq("id", (soilModal as SoilImprovement).id);
        if (e) throw e;
      }
      await reload();
      setSoilModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSoilSaving(false);
    }
  }

  async function handleSoilDelete(id: string) {
    try {
      setSoilDeletingId(id);
      const { error: e } = await supabase.from("soil_improvements").delete().eq("id", id);
      if (e) throw e;
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSoilDeletingId(null);
    }
  }

  async function handleFertSave() {
    if (!activeFarmId) return;
    try {
      setFertSaving(true);
      setError("");
      const payload = {
        farm_id: activeFarmId,
        date: fertForm.date || null,
        fertiliser: fertForm.fertiliser.trim() || null,
        plants: fertForm.plants.trim() || null,
        notes: fertForm.notes.trim() || null,
      };
      if (fertModal === "new") {
        const { error: e } = await supabase.from("fertilisations").insert(payload);
        if (e) throw e;
      } else if (fertModal) {
        const { error: e } = await supabase.from("fertilisations").update(payload).eq("id", (fertModal as FertilisationEntry).id);
        if (e) throw e;
      }
      await reload();
      setFertModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setFertSaving(false);
    }
  }

  async function handleFertDelete(id: string) {
    try {
      setFertDeletingId(id);
      const { error: e } = await supabase.from("fertilisations").delete().eq("id", id);
      if (e) throw e;
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setFertDeletingId(null);
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
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Field log</h1>
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
              { key: "soil",    label: "Soil improvements", count: soilEntries.length },
              { key: "fertilisation", label: "Fertilisation", count: fertEntries.length },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  tab === key ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {label}
                <span className="ml-2 text-xs opacity-60">{count}</span>
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
        ) : tab === "nursery" ? (
          <SeedlingTable
            rows={nursery}
            columns={["date", "plant", "variety", "quantity", "germination", "notes"]}
            headers={["Date", "Plant", "Variety", "Qty", "Germination", "Notes"]}
            onEdit={openEdit}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        ) : tab === "field" ? (
          <SeedlingTable
            rows={field}
            columns={["date", "row_location", "plant", "quantity", "germination", "notes"]}
            headers={["Date", "Row", "Plant", "Qty", "Germination", "Notes"]}
            onEdit={openEdit}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        ) : tab === "soil" ? (
          <SoilTable
            rows={soilEntries}
            onEdit={(e) => { setSoilForm(soilToForm(e)); setSoilModal(e); }}
            onDelete={handleSoilDelete}
            deletingId={soilDeletingId}
          />
        ) : (
          <FertilisationTable
            rows={fertEntries}
            onEdit={(e) => { setFertForm({ date: e.date ?? "", fertiliser: e.fertiliser ?? "", plants: e.plants ?? "", notes: e.notes ?? "" }); setFertModal(e); }}
            onDelete={handleFertDelete}
            deletingId={fertDeletingId}
          />
        )}
      </div>

      {/* Modal */}
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
              {form.type === "field" && (
                <Field label="Row / Location">
                  <input className={inp} value={form.row_location} onChange={(e) => setForm((p) => ({ ...p, row_location: e.target.value }))} placeholder="A1, South border…" />
                </Field>
              )}
              <Field label="Germination">
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

      {/* Soil improvements modal */}
      {soilModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-semibold">
              {soilModal === "new" ? "Add soil improvement" : `Edit — ${(soilModal as SoilImprovement).method ?? "entry"}`}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <input type="date" className={inp} value={soilForm.date} onChange={(e) => setSoilForm((p) => ({ ...p, date: e.target.value }))} />
                </Field>
                <Field label="Bed / Location">
                  <input className={inp} value={soilForm.bed} onChange={(e) => setSoilForm((p) => ({ ...p, bed: e.target.value }))} placeholder="A2.1" />
                </Field>
              </div>
              <Field label="Method">
                <input className={inp} value={soilForm.method} onChange={(e) => setSoilForm((p) => ({ ...p, method: e.target.value }))} placeholder="Bokashi + hugelculture" />
              </Field>
              <Field label="Notes">
                <textarea className={`${inp} min-h-[80px]`} value={soilForm.notes} onChange={(e) => setSoilForm((p) => ({ ...p, notes: e.target.value }))} placeholder="2 bins, about 15m…" />
              </Field>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={handleSoilSave}
                disabled={soilSaving}
                className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {soilSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setSoilModal(null)}
                className="rounded-2xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Fertilisation modal */}
      {fertModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-semibold">
              {fertModal === "new" ? "Add fertilisation" : `Edit — ${(fertModal as FertilisationEntry).fertiliser ?? "entry"}`}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <input type="date" className={inp} value={fertForm.date} onChange={(e) => setFertForm((p) => ({ ...p, date: e.target.value }))} />
                </Field>
                <Field label="Fertiliser">
                  <input className={inp} value={fertForm.fertiliser} onChange={(e) => setFertForm((p) => ({ ...p, fertiliser: e.target.value }))} placeholder="Bokashi" />
                </Field>
              </div>
              <Field label="Plants / Areas">
                <input className={inp} value={fertForm.plants} onChange={(e) => setFertForm((p) => ({ ...p, plants: e.target.value }))} placeholder="Garden beds, trees…" />
              </Field>
              <Field label="Notes">
                <textarea className={`${inp} min-h-[80px]`} value={fertForm.notes} onChange={(e) => setFertForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Observations…" />
              </Field>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={handleFertSave} disabled={fertSaving} className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60">
                {fertSaving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setFertModal(null)} className="rounded-2xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
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

type Col = "date" | "plant" | "variety" | "quantity" | "germination" | "row_location" | "notes";

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
    if (col === "germination") {
      const g = row.germination;
      if (g === "green") return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Good</span>;
      if (g === "amber") return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-400" />Partial</span>;
      if (g === "red")   return <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700"><span className="h-2 w-2 rounded-full bg-rose-500" />Failed</span>;
      return <span className="text-zinc-300">—</span>;
    }
    const val = row[col];
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

/* ── Soil improvements table ─────────────────────────────── */

function SoilTable({
  rows, onEdit, onDelete, deletingId,
}: {
  rows: SoilImprovement[];
  onEdit: (e: SoilImprovement) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">
        No soil improvements logged yet. Click + Add entry to get started.
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Bed</th>
              <th className="px-4 py-3 text-left">Method</th>
              <th className="px-4 py-3 text-left">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 align-top transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-zinc-700">{fmt(row.date)}</td>
                <td className="px-4 py-3 font-medium whitespace-nowrap">{row.bed ?? <span className="text-zinc-300">—</span>}</td>
                <td className="px-4 py-3 text-zinc-700">{row.method ?? <span className="text-zinc-300">—</span>}</td>
                <td className="px-4 py-3 text-zinc-500 max-w-xs">{row.notes ?? <span className="text-zinc-300">—</span>}</td>
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

/* ── Fertilisation table ─────────────────────────────────── */

function FertilisationTable({
  rows, onEdit, onDelete, deletingId,
}: {
  rows: FertilisationEntry[];
  onEdit: (e: FertilisationEntry) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">
        No fertilisation logged yet. Click + Add entry to get started.
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Fertiliser</th>
              <th className="px-4 py-3 text-left">Plants / Areas</th>
              <th className="px-4 py-3 text-left">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 align-top transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-zinc-700">{fmt(row.date)}</td>
                <td className="px-4 py-3 font-medium whitespace-nowrap">{row.fertiliser ?? <span className="text-zinc-300">—</span>}</td>
                <td className="px-4 py-3 text-zinc-700">{row.plants ?? <span className="text-zinc-300">—</span>}</td>
                <td className="px-4 py-3 text-zinc-500 max-w-xs">{row.notes ?? <span className="text-zinc-300">—</span>}</td>
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
