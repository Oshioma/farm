"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getFarms,
  getHarvestEta,
  getZones,
  getCrops,
  HARVEST_MONTHS,
  harvestSeasonYear,
  bedLabel,
} from "@/lib/farm";
import type { Farm, HarvestEtaEntry, Zone, Crop, HarvestMonthKey } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useFarmRole } from "@/hooks/useFarmRole";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

const MONTHS = HARVEST_MONTHS;
type MonthKey = HarvestMonthKey;

type FormData = {
  crop_id: string;
  bed_name: string;
  zone_id: string;
  main_crop: string;
  expected_harvest_date: string;
  beneficial_companions: string;
  notes: string;
} & Record<`${MonthKey}_expected` | `${MonthKey}_actual`, string>;

function blankForm(): FormData {
  const f: Record<string, string> = {
    crop_id: "",
    bed_name: "",
    zone_id: "",
    main_crop: "",
    expected_harvest_date: "",
    beneficial_companions: "",
    notes: "",
  };
  for (const m of MONTHS) {
    f[`${m.key}_expected`] = "";
    f[`${m.key}_actual`] = "";
  }
  return f as FormData;
}

function entryToForm(e: HarvestEtaEntry): FormData {
  const f: Record<string, string> = {
    crop_id: e.crop_id ?? "",
    bed_name: e.bed_name ?? "",
    zone_id: e.zone_id ?? "",
    main_crop: e.main_crop ?? "",
    expected_harvest_date: e.expected_harvest_date ?? "",
    beneficial_companions: e.beneficial_companions ?? "",
    notes: e.notes ?? "",
  };
  for (const m of MONTHS) {
    f[`${m.key}_expected`] = (e as Record<string, unknown>)[`${m.key}_expected`] as string ?? "";
    f[`${m.key}_actual`] = (e as Record<string, unknown>)[`${m.key}_actual`] as string ?? "";
  }
  return f as FormData;
}

function cropLabel(c: Crop): string {
  return c.crop_name + (c.variety ? ` · ${c.variety}` : "");
}

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/* A row on the sheet is one crop. Crops with no saved entry yet still get a
   row so an estimate can be added; saved rows that no longer match a crop (the
   original CSV import) keep their own rows at the bottom. */
type CropRow = {
  key: string;
  entry: HarvestEtaEntry | null;
  crop: Crop | null;
  cropName: string;
  beds: string;
  zoneId: string | null;
  expectedHarvestDate: string | null;
};

type ViewMode = "crops" | "missing" | "saved";

function bedsForCrop(crop: Crop, zones: Zone[]): string {
  const labels = (crop.zone_ids ?? [])
    .map((zid) => bedLabel(zones.find((z) => z.id === zid)))
    .filter(Boolean);
  return labels.join(", ");
}

function buildRows(entries: HarvestEtaEntry[], zones: Zone[], crops: Crop[]): CropRow[] {
  const usedEntryIds = new Set<string>();

  const rows: CropRow[] = crops.map((crop) => {
    const beds = bedsForCrop(crop, zones);
    const zoneIds = crop.zone_ids ?? [];

    /* Prefer the hard crop link. Otherwise adopt an unlinked row for the same
       bed whose main crop names this crop — that is how the CSV rows join up
       with the crops they were describing. Saving the row writes the link. */
    const entry =
      entries.find((e) => !usedEntryIds.has(e.id) && e.crop_id === crop.id) ??
      entries.find(
        (e) =>
          !usedEntryIds.has(e.id) &&
          !e.crop_id &&
          norm(e.main_crop).includes(norm(crop.crop_name)) &&
          (zoneIds.includes(e.zone_id ?? "") ||
            zoneIds.some((zid) => {
              const z = zones.find((zn) => zn.id === zid);
              return z ? norm(e.bed_name) === norm(bedLabel(z)) : false;
            }))
      ) ??
      null;
    if (entry) usedEntryIds.add(entry.id);

    return {
      key: `crop:${crop.id}`,
      entry,
      crop,
      cropName: cropLabel(crop),
      beds: beds || entry?.bed_name || "—",
      zoneId: crop.zone_id ?? entry?.zone_id ?? null,
      expectedHarvestDate: entry?.expected_harvest_date ?? crop.expected_harvest_start ?? null,
    };
  });

  for (const e of entries) {
    if (usedEntryIds.has(e.id)) continue;
    rows.push({
      key: `entry:${e.id}`,
      entry: e,
      crop: null,
      cropName: e.main_crop?.trim() || "—",
      beds: e.bed_name || "—",
      zoneId: e.zone_id,
      expectedHarvestDate: e.expected_harvest_date,
    });
  }

  return rows.sort(
    (a, b) =>
      a.cropName.localeCompare(b.cropName, undefined, { numeric: true, sensitivity: "base" }) ||
      a.beds.localeCompare(b.beds, undefined, { numeric: true, sensitivity: "base" })
  );
}

function rowHasEstimates(row: CropRow): boolean {
  if (!row.entry) return false;
  const e = row.entry as Record<string, unknown>;
  return MONTHS.some((m) => e[`${m.key}_expected`] || e[`${m.key}_actual`]);
}

export default function HarvestEtaPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [entries, setEntries] = useState<HarvestEtaEntry[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [year, setYear] = useState(() => harvestSeasonYear());
  const [view, setView] = useState<ViewMode>("crops");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<HarvestEtaEntry | null | "new">(null);
  const [form, setForm] = useState<FormData>(blankForm());
  const [modalTitle, setModalTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  useFarmSelection({ farms, activeFarmId, setActiveFarmId });
  const { isManager } = useFarmRole(activeFarmId);
  const activeFarmIdRef = useRef(activeFarmId);
  useEffect(() => {
    activeFarmIdRef.current = activeFarmId;
  }, [activeFarmId]);

  async function loadEntries(farmId: string, yr: number) {
    const [rows, zoneRows, cropRows] = await Promise.all([getHarvestEta(farmId, yr), getZones(farmId), getCrops(farmId)]);
    if (activeFarmIdRef.current !== farmId) return;
    setEntries(rows);
    setZones(zoneRows);
    setCrops(cropRows);
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
    loadEntries(activeFarmId, year)
      .catch((err) => setError(errMsg(err, "Failed to load")))
      .finally(() => setLoading(false));
  }, [activeFarmId, year]);

  const allRows = useMemo(() => buildRows(entries, zones, crops), [entries, zones, crops]);
  const missingEstimates = useMemo(() => allRows.filter((r) => !rowHasEstimates(r)).length, [allRows]);
  const rows = useMemo(() => {
    if (view === "missing") return allRows.filter((r) => !rowHasEstimates(r));
    if (view === "saved") return allRows.filter((r) => r.entry);
    return allRows;
  }, [allRows, view]);

  async function handleSave() {
    if (!activeFarmId || !form.bed_name.trim()) return;
    try {
      setSaving(true);
      setError("");
      const payload: Record<string, unknown> = {
        farm_id: activeFarmId,
        year,
        bed_name: form.bed_name.trim(),
        crop_id: form.crop_id || null,
        zone_id: form.zone_id || null,
        main_crop: form.main_crop.trim() || null,
        expected_harvest_date: form.expected_harvest_date || null,
        beneficial_companions: form.beneficial_companions.trim() || null,
        notes: form.notes.trim() || null,
      };
      for (const m of MONTHS) {
        payload[`${m.key}_expected`] = form[`${m.key}_expected`].trim() || null;
        payload[`${m.key}_actual`] = form[`${m.key}_actual`].trim() || null;
      }
      if (modal === "new") {
        const { error: e } = await supabase.from("harvest_eta").insert(payload);
        if (e) throw e;
      } else if (modal) {
        const { error: e } = await supabase.from("harvest_eta").update(payload).eq("id", (modal as HarvestEtaEntry).id);
        if (e) throw e;
      }
      await loadEntries(activeFarmId, year);
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
      const { error: e } = await supabase.from("harvest_eta").delete().eq("id", id);
      if (e) throw e;
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(errMsg(err, "Failed to delete"));
    } finally {
      setDeletingId(null);
    }
  }

  /* Edit a saved row, or start one pre-filled from the crop it belongs to. */
  function openRow(row: CropRow) {
    const title = row.beds && row.beds !== "—" ? `${row.cropName} · ${row.beds}` : row.cropName;
    if (row.entry) {
      const f = entryToForm(row.entry);
      /* A row adopted by name keeps the link once it is saved. */
      if (!f.crop_id && row.crop) f.crop_id = row.crop.id;
      setForm(f);
      setModalTitle(`Edit — ${title}`);
      setModal(row.entry);
      return;
    }
    const f = blankForm();
    f.bed_name = row.beds === "—" ? "" : row.beds;
    f.zone_id = row.zoneId ?? "";
    f.main_crop = row.cropName === "—" ? "" : row.cropName;
    f.crop_id = row.crop?.id ?? "";
    f.expected_harvest_date = row.expectedHarvestDate ?? "";
    setForm(f);
    setModalTitle(`Add estimate — ${title}`);
    setModal("new");
  }

  function openAdd() {
    setForm(blankForm());
    setModalTitle("Add row");
    setModal("new");
  }

  const activeFarm = farms.find((f) => f.id === activeFarmId);

  const VIEWS: { key: ViewMode; label: string }[] = [
    { key: "crops", label: "All crops" },
    { key: "missing", label: "Needs an estimate" },
    { key: "saved", label: "Saved entries" },
  ];

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Harvest ETA</h1>
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

        {/* Year navigation + Add */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              ← {year - 1}
            </button>
            <span className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white">
              Mar {year} – Feb {year + 1}
            </span>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              {year + 1} →
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">
              {rows.length} crop{rows.length === 1 ? "" : "s"}
              {missingEstimates > 0 ? ` · ${missingEstimates} without an estimate` : ""}
            </span>
            {isManager && (
              <button
                onClick={openAdd}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                + Add row
              </button>
            )}
          </div>
        </div>

        {/* View filter */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-zinc-200 bg-white p-1">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  view === v.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {missingEstimates > 0 && view !== "missing" && (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
              {missingEstimates} crop{missingEstimates === 1 ? "" : "s"} still need an estimate
            </span>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-center text-sm text-zinc-500">
            {view === "saved"
              ? `No saved harvest ETA entries for ${year}.`
              : view === "missing"
                ? "Every crop has an estimate."
                : crops.length === 0
                  ? "No crops planted yet — add crops on the farm page, or transplant from the nursery."
                  : `Nothing to show for ${year}.`}
            {isManager && view !== "missing" ? " You can also click “+ Add row”." : ""}
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-2.5 text-left">Crop</th>
                    <th className="px-3 py-2.5 text-left">Bed(s)</th>
                    <th className="px-3 py-2.5 text-left">Harvest Date</th>
                    <th className="px-3 py-2.5 text-left">Companions</th>
                    {MONTHS.map((m) => (
                      <th key={m.key} className="px-2 py-2.5 text-center" colSpan={2}>
                        <div>{m.label}</div>
                        <div className="mt-0.5 flex gap-0 text-[9px] font-normal normal-case tracking-normal text-zinc-400">
                          <span className="flex-1">Exp</span>
                          <span className="flex-1">Act</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-left">Notes</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const entry = row.entry as Record<string, unknown> | null;
                    return (
                      <tr key={row.key} className={`border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 align-top transition-colors ${row.entry ? "" : "bg-amber-50/30"}`}>
                        <td className={`sticky left-0 z-10 px-3 py-2 font-semibold text-zinc-900 whitespace-nowrap ${row.entry ? "bg-white" : "bg-amber-50/60"}`}>
                          {row.cropName}
                          {!row.crop && (
                            <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500" title="Saved row with no matching crop">
                              no crop
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-zinc-600">{row.beds}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-zinc-600">{row.expectedHarvestDate ?? <span className="text-zinc-300">—</span>}</td>
                        <td className="px-3 py-2 text-zinc-600 max-w-[120px] truncate">{row.entry?.beneficial_companions ?? <span className="text-zinc-300">—</span>}</td>
                        {MONTHS.map((m) => {
                          const exp = entry ? (entry[`${m.key}_expected`] as string | null) : null;
                          const act = entry ? (entry[`${m.key}_actual`] as string | null) : null;
                          return (
                            <td key={m.key} colSpan={2} className="px-1 py-2">
                              <div className="flex gap-0.5 text-center">
                                <span className={`flex-1 rounded px-1 py-0.5 ${exp ? "bg-emerald-50 text-emerald-700" : "text-zinc-300"}`}>
                                  {exp || "—"}
                                </span>
                                <span className={`flex-1 rounded px-1 py-0.5 ${act ? "bg-blue-50 text-blue-700" : "text-zinc-300"}`}>
                                  {act || "—"}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-zinc-500 max-w-[120px] truncate">{row.entry?.notes ?? <span className="text-zinc-300">—</span>}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isManager && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => openRow(row)}
                                className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                                  row.entry
                                    ? "border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                                    : "bg-zinc-900 text-white hover:bg-zinc-800"
                                }`}
                              >
                                {row.entry ? "Edit" : "+ Estimate"}
                              </button>
                              {row.entry && (
                                <button onClick={() => handleDelete(row.entry!.id)} disabled={deletingId === row.entry.id} className="rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
                                  {deletingId === row.entry.id ? "…" : "Del"}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-emerald-50 border border-emerald-200" /> Expected</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-blue-50 border border-blue-200" /> Actual</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-amber-50 border border-amber-200" /> No estimate saved for this crop yet</span>
        </div>
      </div>

      {/* Modal */}
      {isManager && modal !== null && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-semibold">{modalTitle || "Bed entry"}</h2>
            <div className="space-y-3">
              {/* Link to existing crop */}
              {crops.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                    Crop <span className="font-normal text-zinc-400">(the row belongs to this crop; auto-fills bed &amp; name)</span>
                  </label>
                  <select
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    value={form.crop_id}
                    onChange={(e) => {
                      const selected = crops.find((c) => c.id === e.target.value);
                      if (selected) {
                        // Find the bed name from the zone code
                        const primaryZone = zones.find((z) => z.id === selected.zone_id);
                        const bedName = primaryZone ? bedLabel(primaryZone) : form.bed_name;
                        setForm((p) => ({
                          ...p,
                          crop_id: selected.id,
                          main_crop: cropLabel(selected),
                          zone_id: selected.zone_id ?? "",
                          bed_name: bedName,
                          expected_harvest_date: selected.expected_harvest_start ?? p.expected_harvest_date,
                        }));
                      } else {
                        setForm((p) => ({ ...p, crop_id: "" }));
                      }
                    }}
                  >
                    <option value="">— Select a crop (optional) —</option>
                    {crops.map((c) => (
                      <option key={c.id} value={c.id}>
                        {cropLabel(c)}
                        {c.zone_ids?.length ? ` (${c.zone_ids.map((zid) => bedLabel(zones.find((z) => z.id === zid))).filter(Boolean).join(", ")})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Core fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Bed name</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    value={form.bed_name}
                    onChange={(e) => setForm((p) => ({ ...p, bed_name: e.target.value }))}
                    placeholder="TR1, R1, CL1…"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Main crop</label>
                  <input className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.main_crop} onChange={(e) => setForm((p) => ({ ...p, main_crop: e.target.value }))} placeholder="Tomatoes" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Expected harvest date</label>
                  <input className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.expected_harvest_date} onChange={(e) => setForm((p) => ({ ...p, expected_harvest_date: e.target.value }))} placeholder="Jun 2025" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Beneficial companions</label>
                  <input className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.beneficial_companions} onChange={(e) => setForm((p) => ({ ...p, beneficial_companions: e.target.value }))} placeholder="Basil, Marigold" />
                </div>
              </div>
              {zones.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Link to zone <span className="font-normal text-zinc-400">(optional)</span></label>
                  <select
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    value={form.zone_id}
                    onChange={(e) => setForm((p) => ({ ...p, zone_id: e.target.value }))}
                  >
                    <option value="">— None —</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.code ? `${z.code} — ${z.name}` : z.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Monthly fields */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Monthly yields (Expected / Actual)</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {MONTHS.map((m) => {
                    const isNextYear = m.key === "jan" || m.key === "feb";
                    return (
                      <div key={m.key} className="rounded-xl border border-zinc-200 p-2.5">
                        <p className="mb-1.5 text-[11px] font-semibold text-zinc-600">{m.label} {isNextYear ? year + 1 : year}</p>
                        <div className="flex gap-1.5">
                          <input
                            className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-emerald-500 bg-emerald-50/30"
                            value={form[`${m.key}_expected`]}
                            onChange={(e) => setForm((p) => ({ ...p, [`${m.key}_expected`]: e.target.value }))}
                            placeholder="Exp"
                          />
                          <input
                            className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500 bg-blue-50/30"
                            value={form[`${m.key}_actual`]}
                            onChange={(e) => setForm((p) => ({ ...p, [`${m.key}_actual`]: e.target.value }))}
                            placeholder="Act"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Notes</label>
                <textarea className="min-h-[60px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={handleSave} disabled={saving || !form.bed_name.trim()} className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60">
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
