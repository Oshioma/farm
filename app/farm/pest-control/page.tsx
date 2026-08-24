"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bug } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFarms, getPestControls, getZones } from "@/lib/farm";
import type { Farm, PestControlEntry, Zone } from "@/lib/farm";
import { createLunarTask } from "@/lib/lunarTasks";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useFarmRole } from "@/hooks/useFarmRole";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

const METHODS = ["Spray", "Drench", "Dust", "Trap", "Manual removal", "Biological", "Other"];

const blank = {
  date: "",
  product: "",
  target_pest: "",
  method: "",
  quantity: "",
  zone_ids: [] as string[],
  notes: "",
  next_spray_date: "",
};

function taskTitleFor(product: string): string {
  return product.trim() ? `Pest control: ${product.trim()}` : "Pest control";
}

export default function PestControlPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [entries, setEntries] = useState<PestControlEntry[]>([]);
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
  const quickAddHandledRef = useRef(false);
  useFarmSelection({ farms, activeFarmId, setActiveFarmId });
  const { isManager } = useFarmRole(activeFarmId);
  const activeFarmIdRef = useRef(activeFarmId);
  useEffect(() => {
    activeFarmIdRef.current = activeFarmId;
  }, [activeFarmId]);

  async function loadEntries(farmId: string) {
    const [rows, zoneRows] = await Promise.all([getPestControls(farmId), getZones(farmId)]);
    if (activeFarmIdRef.current !== farmId) return;
    setEntries(rows);
    setZones(zoneRows);
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

  useEffect(() => {
    if (quickAddHandledRef.current) return;
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const quickAddRequested = searchParams.get("quickAdd") === "1";
    if (!quickAddRequested || !activeFarmId || loading) return;

    const requestedZoneId = searchParams.get("zoneId")?.trim() ?? "";
    const requestedBed = searchParams.get("bed")?.trim().toUpperCase() ?? "";
    let preselectedZoneId = requestedZoneId;
    if (!preselectedZoneId && requestedBed) {
      if (zones.length === 0) return;
      preselectedZoneId = zones.find((zone) => {
        const code = (zone.code ?? "").toUpperCase();
        const name = zone.name.toUpperCase();
        return (
          code === requestedBed ||
          name === requestedBed ||
          code.replace(/^ROW\s*/i, "") === requestedBed ||
          name.replace(/^ROW\s*/i, "") === requestedBed
        );
      })?.id ?? "";
    }

    const today = new Date();
    const localIsoDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

    setForm({
      ...blank,
      date: localIsoDate,
      zone_ids: preselectedZoneId ? [preselectedZoneId] : [],
    });
    setShowForm(true);
    quickAddHandledRef.current = true;

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("quickAdd");
    nextUrl.searchParams.delete("zoneId");
    nextUrl.searchParams.delete("bed");
    const query = nextUrl.searchParams.toString();
    router.replace(`${nextUrl.pathname}${query ? `?${query}` : ""}${nextUrl.hash}`, { scroll: false });
  }, [activeFarmId, loading, router, zones]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarmId || !form.date || !form.product.trim()) return;
    setSaving(true);
    setError("");
    try {
      const zoneIds = form.zone_ids.filter(Boolean);
      const bedNames = zoneIds
        .map((id) => zones.find((z) => z.id === id)?.name)
        .filter(Boolean)
        .join(", ");

      let nextTaskId: string | null = null;
      if (form.next_spray_date) {
        const { data: taskData, error: taskErr } = await supabase
          .from("tasks")
          .insert({
            farm_id: activeFarmId,
            title: taskTitleFor(form.product),
            description: bedNames ? `Beds: ${bedNames}` : null,
            status: "todo",
            priority: "medium",
            due_date: form.next_spray_date,
            zone_id: zoneIds[0] || null,
            goal_timeframe: "month",
            proof_required: false,
          })
          .select("id")
          .single();
        if (taskErr) throw taskErr;
        nextTaskId = taskData.id;
      }

      const entry = {
        farm_id: activeFarmId,
        date: form.date,
        product: form.product.trim(),
        target_pest: form.target_pest.trim() || null,
        method: form.method || null,
        quantity: form.quantity.trim() || null,
        zone_id: zoneIds[0] || null,
        extra_zone_ids: zoneIds.length > 1 ? JSON.stringify(zoneIds.slice(1)) : null,
        notes: form.notes.trim() || null,
        next_spray_date: form.next_spray_date || null,
        next_spray_task_id: nextTaskId,
      };

      const { error: err } = await supabase.from("pest_controls").insert(entry);
      if (err) throw err;

      // Also surface the next-spray date on the Lunar Planner (separate from
      // the linked goal created above) so it appears in both places.
      if (form.next_spray_date) {
        await createLunarTask({
          farmId: activeFarmId,
          date: form.next_spray_date,
          title: taskTitleFor(form.product),
          category: "Pest Control",
          cropOrActivity: bedNames || null,
        });
      }

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
        product: editForm.product.trim() || null,
        target_pest: editForm.target_pest.trim() || null,
        method: editForm.method || null,
        quantity: editForm.quantity.trim() || null,
        notes: editForm.notes.trim() || null,
      };

      const zoneIds = editForm.zone_ids.filter(Boolean);
      const bedNames = zoneIds
        .map((zid) => zones.find((z) => z.id === zid)?.name)
        .filter(Boolean)
        .join(", ");
      const taskTitle = taskTitleFor(editForm.product);
      const newDate = editForm.next_spray_date || null;

      const existing = entries.find((e) => e.id === id);
      let nextTaskId = existing?.next_spray_task_id ?? null;

      if (newDate && nextTaskId) {
        // Keep the linked goal in sync instead of creating a duplicate.
        const { error: taskErr } = await supabase
          .from("tasks")
          .update({
            title: taskTitle,
            description: bedNames ? `Beds: ${bedNames}` : null,
            due_date: newDate,
            zone_id: zoneIds[0] || null,
          })
          .eq("id", nextTaskId);
        if (taskErr) throw taskErr;
      } else if (newDate && !nextTaskId) {
        const { data: taskData, error: taskErr } = await supabase
          .from("tasks")
          .insert({
            farm_id: activeFarmId,
            title: taskTitle,
            description: bedNames ? `Beds: ${bedNames}` : null,
            status: "todo",
            priority: "medium",
            due_date: newDate,
            zone_id: zoneIds[0] || null,
            goal_timeframe: "month",
            proof_required: false,
          })
          .select("id")
          .single();
        if (taskErr) throw taskErr;
        nextTaskId = taskData.id;
      } else if (!newDate && nextTaskId) {
        // Date was cleared - remove the reminder it created.
        const { error: deleteErr } = await supabase.from("tasks").delete().eq("id", nextTaskId);
        if (deleteErr) throw deleteErr;
        nextTaskId = null;
      }

      const { error: updateErr } = await supabase
        .from("pest_controls")
        .update({
          ...basePayload,
          zone_id: zoneIds[0] || null,
          extra_zone_ids: zoneIds.length > 1 ? JSON.stringify(zoneIds.slice(1)) : null,
          next_spray_date: newDate,
          next_spray_task_id: nextTaskId,
        })
        .eq("id", id);
      if (updateErr) throw updateErr;

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
    const { error: err } = await supabase.from("pest_controls").delete().eq("id", id);
    if (err) setError(errMsg(err, "Failed to delete"));
    else setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  }

  function startEdit(entry: PestControlEntry) {
    setEditingId(entry.id);
    setEditForm({
      date: entry.date ?? "",
      product: entry.product ?? "",
      target_pest: entry.target_pest ?? "",
      method: entry.method ?? "",
      quantity: entry.quantity ?? "",
      zone_ids: entry.zone_ids?.length ? entry.zone_ids : entry.zone_id ? [entry.zone_id] : [],
      notes: entry.notes ?? "",
      next_spray_date: entry.next_spray_date ?? "",
    });
  }

  function fmt(d: string | null) {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }

  function zoneNamesFor(entry: PestControlEntry): string {
    const ids = entry.zone_ids?.length ? entry.zone_ids : entry.zone_id ? [entry.zone_id] : [];
    if (ids.length === 0) return "—";
    return ids
      .map((id) => zones.find((z) => z.id === id)?.name ?? "Unknown zone")
      .join(", ");
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
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pest control log</h1>
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
          <p className="mt-3 text-sm text-zinc-500">
            Every spray or treatment you apply to a bed. The beds map shows these dates, so you can
            see at a glance how many times a bed has been treated.
          </p>
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
            <Bug size={15} />
            Add entry
          </button>

          {showForm && (
            <div className="mt-4 max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">New pest control entry</h2>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Date applied</label>
                    <input type="date" value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900" required />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Method <span className="font-normal text-zinc-400">(optional)</span></label>
                    <select value={form.method}
                      onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900">
                      <option value="">—</option>
                      {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Spray / treatment</label>
                  <input type="text" value={form.product}
                    onChange={(e) => setForm((p) => ({ ...p, product: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="Neem oil, garlic-chilli, soap spray…" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Target pest <span className="font-normal text-zinc-400">(optional)</span></label>
                  <input type="text" value={form.target_pest}
                    onChange={(e) => setForm((p) => ({ ...p, target_pest: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="Aphids, cutworm…" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Quantity used <span className="font-normal text-zinc-400">(optional)</span></label>
                  <input type="text" value={form.quantity}
                    onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="5 L, 2 knapsacks…" />
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
                  <label className="mb-2 block text-sm font-medium">
                    Next time to spray <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <input type="date" value={form.next_spray_date}
                    onChange={(e) => setForm((p) => ({ ...p, next_spray_date: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900" />
                  <p className="mt-1.5 text-xs text-zinc-400">
                    Adds a goal on this date so you get reminded to spray again.
                  </p>
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
            <Bug className="mx-auto mb-3 text-zinc-300" size={32} />
            <p className="text-sm text-zinc-500">No entries yet. Add one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Spray / treatment</th>
                  <th className="px-5 py-4">Target pest</th>
                  <th className="px-5 py-4">Method</th>
                  <th className="px-5 py-4">Quantity</th>
                  <th className="px-5 py-4">Next spray</th>
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
                        <input type="text" value={editForm.product}
                          onChange={(e) => setEditForm((p) => ({ ...p, product: e.target.value }))}
                          className="w-full min-w-[140px] rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={editForm.target_pest}
                          onChange={(e) => setEditForm((p) => ({ ...p, target_pest: e.target.value }))}
                          className="w-full min-w-[120px] rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={editForm.method}
                          onChange={(e) => setEditForm((p) => ({ ...p, method: e.target.value }))}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900">
                          <option value="">—</option>
                          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={editForm.quantity}
                          onChange={(e) => setEditForm((p) => ({ ...p, quantity: e.target.value }))}
                          className="w-full min-w-[90px] rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="date" value={editForm.next_spray_date}
                          onChange={(e) => setEditForm((p) => ({ ...p, next_spray_date: e.target.value }))}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
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
                      <td className="px-5 py-4 text-zinc-700">{entry.product ?? "—"}</td>
                      <td className="px-5 py-4 text-zinc-600">{entry.target_pest ?? "—"}</td>
                      <td className="px-5 py-4 text-zinc-600">{entry.method ?? "—"}</td>
                      <td className="px-5 py-4 text-zinc-600">{entry.quantity ?? "—"}</td>
                      <td className="px-5 py-4 tabular-nums text-zinc-600">{fmt(entry.next_spray_date)}</td>
                      <td className="px-5 py-4 text-zinc-600">{zoneNamesFor(entry)}</td>
                      <td className="px-5 py-4 text-zinc-500">{entry.notes ?? "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(entry)}
                            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100">
                            Edit
                          </button>
                          {isManager && (
                            <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id}
                              className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                              Delete
                            </button>
                          )}
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
