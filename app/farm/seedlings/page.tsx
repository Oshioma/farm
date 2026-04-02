"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms, getSeedlings } from "@/lib/farm";
import type { Farm, SeedlingEntry } from "@/lib/farm";

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

/* ── Page ─────────────────────────────────────────────────── */

export default function SeedlingsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [entries, setEntries] = useState<SeedlingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"nursery" | "field">("nursery");

  const [modal, setModal] = useState<SeedlingEntry | null | "new">(null);
  const [form, setForm] = useState<FormData>(blank("nursery"));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    getSeedlings(activeFarmId)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load seedlings"))
      .finally(() => setLoading(false));
  }, [activeFarmId]);

  async function reload() {
    if (!activeFarmId) return;
    setEntries(await getSeedlings(activeFarmId));
  }

  function openAdd() {
    setForm(blank(tab));
    setModal("new");
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
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Seedlings log</h1>
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
          <div className="flex gap-2">
            {(["nursery", "field"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  tab === t ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {t === "nursery" ? "Nursery starts" : "Field plantings"}
                <span className="ml-2 text-xs opacity-60">
                  {t === "nursery" ? nursery.length : field.length}
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
        ) : tab === "nursery" ? (
          <SeedlingTable
            rows={nursery}
            columns={["date", "plant", "variety", "quantity", "germination", "notes"]}
            headers={["Date", "Plant", "Variety", "Qty", "Germination", "Notes"]}
            onEdit={openEdit}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        ) : (
          <SeedlingTable
            rows={field}
            columns={["date", "row_location", "plant", "quantity", "germination", "notes"]}
            headers={["Date", "Row", "Plant", "Qty", "Germination", "Notes"]}
            onEdit={openEdit}
            onDelete={handleDelete}
            deletingId={deletingId}
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
                <input className={inp} value={form.germination} onChange={(e) => setForm((p) => ({ ...p, germination: e.target.value }))} placeholder="%" />
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
