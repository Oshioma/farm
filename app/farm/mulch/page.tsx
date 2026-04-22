"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms, getMulch, getZones } from "@/lib/farm";
import type { Farm, MulchEntry, Zone } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

const blankForm = { mulch_type: "", date: "", source: "", zone_ids: [] as string[], notes: "" };

function fmt(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function MulchPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [entries, setEntries] = useState<MulchEntry[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<MulchEntry | null | "new">(null);
  const [form, setForm] = useState(blankForm);
  const [zoneSearch, setZoneSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const quickAddHandledRef = useRef(false);
  const normalizedZoneSearch = zoneSearch.trim().toLowerCase();
  const filteredZones = zones.filter((z) =>
    z.name.toLowerCase().includes(normalizedZoneSearch)
  );

  useFarmSelection({ farms, activeFarmId, setActiveFarmId });

  async function loadEntries(farmId: string) {
    const [rows, zoneRows] = await Promise.all([getMulch(farmId), getZones(farmId)]);
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
    const quickAddRequested = searchParams.get("quickAdd") === "1";
    if (!quickAddRequested || !activeFarmId || loading) return;

    const requestedZoneId = searchParams.get("zoneId")?.trim() ?? "";
    const requestedBed = searchParams.get("bed")?.trim().toUpperCase() ?? "";
    let preselectedZoneId = "";

    if (requestedZoneId && zones.some((zone) => zone.id === requestedZoneId)) {
      preselectedZoneId = requestedZoneId;
    } else if (requestedBed) {
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

    setZoneSearch("");
    setForm({
      ...blankForm,
      date: localIsoDate,
      zone_ids: preselectedZoneId ? [preselectedZoneId] : [],
    });
    setModal("new");
    quickAddHandledRef.current = true;

    if (typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("quickAdd");
      nextUrl.searchParams.delete("zoneId");
      nextUrl.searchParams.delete("bed");
      const query = nextUrl.searchParams.toString();
      router.replace(`${nextUrl.pathname}${query ? `?${query}` : ""}${nextUrl.hash}`, { scroll: false });
    }
  }, [activeFarmId, loading, router, searchParams, zones]);

  async function handleSave() {
    if (!activeFarmId) return;
    try {
      setSaving(true);
      setError("");
      const basePayload = {
        farm_id: activeFarmId,
        mulch_type: form.mulch_type.trim() || null,
        date: form.date || null,
        source: form.source.trim() || null,
        notes: form.notes.trim() || null,
      };

      const zoneIds = form.zone_ids.filter(Boolean);

      if (modal === "new") {
        const rows = zoneIds.length > 0
          ? zoneIds.map((zid) => ({ ...basePayload, zone_id: zid }))
          : [{ ...basePayload, zone_id: null }];

        const { error: e } = await supabase.from("mulch").insert(rows);
        if (e) throw e;
      } else if (modal) {
        const { error: e } = await supabase.from("mulch").update({ ...basePayload, zone_id: zoneIds[0] || null }).eq("id", (modal as MulchEntry).id);
        if (e) throw e;

        if (zoneIds.length > 1) {
          const additionalEntries = zoneIds.slice(1).map((zid) => ({
            ...basePayload,
            zone_id: zid,
          }));
          const { error: e2 } = await supabase.from("mulch").insert(additionalEntries);
          if (e2) throw e2;
        }
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
      const { error: e } = await supabase.from("mulch").delete().eq("id", id);
      if (e) throw e;
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(errMsg(err, "Failed to delete"));
    } finally {
      setDeletingId(null);
    }
  }

  function openEdit(entry: MulchEntry) {
    setZoneSearch("");
    setForm({
      mulch_type: entry.mulch_type ?? "",
      date: entry.date ?? "",
      source: entry.source ?? "",
      zone_ids: entry.zone_id ? [entry.zone_id] : [],
      notes: entry.notes ?? "",
    });
    setModal(entry);
  }

  function openAdd() {
    setZoneSearch("");
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
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mulch register</h1>
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
            + Add mulch
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-center text-sm text-zinc-500">
            No mulch entries yet.
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Date applied</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-left">Zone / Bed</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row) => (
                    <tr key={row.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 align-top transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{row.mulch_type ?? <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-700">{fmt(row.date)}</td>
                      <td className="px-4 py-3 text-zinc-600">{row.source ?? <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{row.zone?.[0]?.name || (row.zone_id ? zones.find((z) => z.id === row.zone_id)?.name ?? "Unknown zone" : <span className="text-zinc-300">—</span>)}</td>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6 sm:items-center sm:py-10">
          <div className="flex w-full max-w-lg max-h-[calc(100vh-2rem)] flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl sm:max-h-[calc(100vh-5rem)]">
            <h2 className="mb-5 text-lg font-semibold">
              {modal === "new" ? "Add mulch entry" : `Edit — ${(modal as MulchEntry).mulch_type ?? "entry"}`}
            </h2>
            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Mulch type</label>
                  <input className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.mulch_type} onChange={(e) => setForm((p) => ({ ...p, mulch_type: e.target.value }))} placeholder="Straw, Wood chips, Bark…" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Date applied</label>
                  <input type="date" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Source</label>
                <input className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} placeholder="Where it came from" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Zones / Beds <span className="font-normal text-zinc-400">(select multiple)</span></label>
                <input
                  value={zoneSearch}
                  onChange={(e) => setZoneSearch(e.target.value)}
                  placeholder="Search beds…"
                  className="mb-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                />
                <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-zinc-300 p-3">
                  {zones.length === 0 ? (
                    <p className="text-xs text-zinc-400">No zones available</p>
                  ) : filteredZones.length === 0 ? (
                    <p className="text-xs text-zinc-400">No beds match your search.</p>
                  ) : (
                    filteredZones.map((z) => (
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
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Notes</label>
                <textarea className="min-h-[70px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex gap-2 border-t border-zinc-100 pt-4">
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
