"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFarms, getFertilisations, getZones } from "@/lib/farm";
import type { Farm, FertilisationEntry, Zone } from "@/lib/farm";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

const BIN_COLOURS = ["Green", "Blue", "Brown", "Black", "Red", "Yellow", "Other"];

const blank = {
  date: "",
  fertiliser: "",
  ready_to_use: "",
  bin_colour: "",
  zone_ids: [] as string[],
  notes: "",
};

export default function FertiliserPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [entries, setEntries] = useState<FertilisationEntry[]>([]);
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
    const [rows, zoneRows] = await Promise.all([getFertilisations(farmId), getZones(farmId)]);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarmId || !form.date || !form.fertiliser.trim()) return;
    setSaving(true);
    setError("");
    try {
      const zoneIds = form.zone_ids.filter(Boolean);
      const entries = zoneIds.length > 0
        ? zoneIds.map(zid => ({
            farm_id: activeFarmId,
            date: form.date,
            fertiliser: form.fertiliser.trim(),
            ready_to_use: form.ready_to_use || null,
            bin_colour: form.bin_colour || null,
            zone_id: zid,
            notes: form.notes.trim() || null,
          }))
        : [{
            farm_id: activeFarmId,
            date: form.date,
            fertiliser: form.fertiliser.trim(),
            ready_to_use: form.ready_to_use || null,
            bin_colour: form.bin_colour || null,
            zone_id: null,
            notes: form.notes.trim() || null,
          }];

      const { error: err } = await supabase.from("fertilisations").insert(entries);
      if (err) throw err;
      setForm(blank);
      setShowForm(false);
      await loadEntries(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to save entry"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id: string) {
    setSavingEditId(id);
    setError("");
    try {
      const basePayload = {
        date: editForm.date || null,
        fertiliser: editForm.fertiliser.trim() || null,
        ready_to_use: editForm.ready_to_use || null,
        bin_colour: editForm.bin_colour || null,
        notes: editForm.notes.trim() || null,
      };

      const zoneIds = editForm.zone_ids.filter(Boolean);

      // Update the original entry with the first zone (or null)
      const { error: updateErr } = await supabase
        .from("fertilisations")
        .update({
          ...basePayload,
          zone_id: zoneIds[0] || null,
        })
        .eq("id", id);
      if (updateErr) throw updateErr;

      // Create new entries for additional zones
      if (zoneIds.length > 1) {
        const additionalEntries = zoneIds.slice(1).map(zoneId => ({
          farm_id: activeFarmId,
          ...basePayload,
          zone_id: zoneId,
        }));
        const { error: insertErr } = await supabase
          .from("fertilisations")
          .insert(additionalEntries);
        if (insertErr) throw insertErr;
      }

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
    const { error: err } = await supabase.from("fertilisations").delete().eq("id", id);
    if (err) setError(errMsg(err, "Failed to delete"));
    else setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  }

  function startEdit(entry: FertilisationEntry) {
    setEditingId(entry.id);
    setEditForm({
      date: entry.date ?? "",
      fertiliser: entry.fertiliser ?? "",
      ready_to_use: entry.ready_to_use ?? "",
      bin_colour: entry.bin_colour ?? "",
      zone_ids: entry.zone_id ? [entry.zone_id] : [],
      notes: entry.notes ?? "",
    });
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
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Fertiliser log</h1>
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
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {/* Add entry */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm((v) => !v)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              showForm ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <FlaskConical size={15} />
            Add entry
          </button>

          {showForm && (
            <div className="mt-4 max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">New fertiliser entry</h2>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Date added</label>
                    <input type="date" value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900" required />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Ready to use</label>
                    <input type="date" value={form.ready_to_use}
                      onChange={(e) => setForm((p) => ({ ...p, ready_to_use: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Fertiliser type</label>
                  <input type="text" value={form.fertiliser}
                    onChange={(e) => setForm((p) => ({ ...p, fertiliser: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="Bokashi, Seaweed…" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Bin colour <span className="font-normal text-zinc-400">(optional)</span></label>
                  <select value={form.bin_colour}
                    onChange={(e) => setForm((p) => ({ ...p, bin_colour: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900">
                    <option value="">—</option>
                    {BIN_COLOURS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Zones / Beds <span className="font-normal text-zinc-400">(select multiple)</span></label>
                  <div className="space-y-2 rounded-2xl border border-zinc-300 p-3">
                    {zones.length === 0 ? (
                      <p className="text-sm text-zinc-400">No zones available</p>
                    ) : (
                      zones.map((z) => (
                        <label key={z.id} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox"
                            checked={form.zone_ids.includes(z.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm((p) => ({ ...p, zone_ids: [...p.zone_ids, z.id] }));
                              } else {
                                setForm((p) => ({ ...p, zone_ids: p.zone_ids.filter((id) => id !== z.id) }));
                              }
                            }}
                            className="rounded border-zinc-300" />
                          <span className="text-sm">{z.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Notes <span className="font-normal text-zinc-400">(optional)</span></label>
                  <textarea value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    rows={2} placeholder="Any extra details…" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={saving}
                    className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60">
                    {saving ? "Saving…" : "Save entry"}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setForm(blank); }}
                    className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
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
            <FlaskConical className="mx-auto mb-3 text-zinc-300" size={32} />
            <p className="text-sm text-zinc-500">No entries yet. Add one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Fertiliser type</th>
                  <th className="px-5 py-4">Ready to use</th>
                  <th className="px-5 py-4">Bin colour</th>
                  <th className="px-5 py-4">Zone / Bed</th>
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
                        <input type="text" value={editForm.fertiliser}
                          onChange={(e) => setEditForm((p) => ({ ...p, fertiliser: e.target.value }))}
                          className="w-full min-w-[140px] rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="date" value={editForm.ready_to_use}
                          onChange={(e) => setEditForm((p) => ({ ...p, ready_to_use: e.target.value }))}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={editForm.bin_colour}
                          onChange={(e) => setEditForm((p) => ({ ...p, bin_colour: e.target.value }))}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900">
                          <option value="">—</option>
                          {BIN_COLOURS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-1 rounded border border-zinc-300 p-2">
                          {zones.length === 0 ? (
                            <p className="text-xs text-zinc-400">No zones</p>
                          ) : (
                            zones.map((z) => (
                              <label key={z.id} className="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox"
                                  checked={editForm.zone_ids.includes(z.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditForm((p) => ({ ...p, zone_ids: [...p.zone_ids, z.id] }));
                                    } else {
                                      setEditForm((p) => ({ ...p, zone_ids: p.zone_ids.filter((id) => id !== z.id) }));
                                    }
                                  }}
                                  className="rounded border-zinc-300" />
                                <span>{z.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={editForm.notes}
                          onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                          className="w-full min-w-[120px] rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(entry.id)} disabled={savingEditId === entry.id}
                            className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60">
                            {savingEditId === entry.id ? "…" : "Save"}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={entry.id} className={`border-b border-zinc-100 last:border-0 ${i % 2 === 0 ? "" : "bg-zinc-50/50"}`}>
                      <td className="px-5 py-4 font-medium tabular-nums">{fmt(entry.date)}</td>
                      <td className="px-5 py-4 text-zinc-700">{entry.fertiliser ?? "—"}</td>
                      <td className="px-5 py-4 tabular-nums text-zinc-600">{fmt(entry.ready_to_use)}</td>
                      <td className="px-5 py-4">
                        {entry.bin_colour ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-block h-3 w-3 rounded-full border border-zinc-200"
                              style={{ backgroundColor: entry.bin_colour.toLowerCase() }} />
                            {entry.bin_colour}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">{entry.zone?.[0]?.name || (entry.zone_id ? zones.find((z) => z.id === entry.zone_id)?.name ?? "Unknown zone" : "—")}</td>
                      <td className="px-5 py-4 text-zinc-500">{entry.notes ?? "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(entry)}
                            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id}
                            className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
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
