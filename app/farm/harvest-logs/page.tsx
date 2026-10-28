"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms, getHarvestLogs, saveHarvestSplits } from "@/lib/farm";
import type { Farm, HarvestLog } from "@/lib/farm";
import { formatDate } from "@/app/farm/utils";
import { ChevronLeft } from "lucide-react";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useFormDraft, discardDraft } from "@/hooks/useFormDraft";
import { useT, useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { splitTotals, splitsFromFields } from "@/lib/harvest";
import type { HarvestSplit } from "@/lib/harvest";
import { HarvestSplitFields, blankSplitFields, splitIsOver } from "@/app/farm/components/HarvestSplitFields";
import type { SplitFields } from "@/app/farm/components/HarvestSplitFields";

type DestinationFilter = "all" | "eh" | "org" | "split" | "unassigned";

function kg(n: number): string {
  return n.toFixed(2);
}

function fieldsFromSplits(splits: HarvestSplit[]): SplitFields {
  const fields = { ...blankSplitFields };
  for (const s of splits) fields[s.destination] = String(s.quantity_kg);
  return fields;
}

/* A harvest counts as not assigned while any of its weight has no destination. */
function destinationMatches(log: HarvestLog, filter: DestinationFilter): boolean {
  if (filter === "all") return true;
  const totals = splitTotals(log.quantity_kg, log.splits);
  if (filter === "eh") return totals.EH > 0;
  if (filter === "org") return totals.ORG > 0;
  if (filter === "split") return totals.EH > 0 && totals.ORG > 0;
  return log.quantity_kg !== null && log.quantity_kg > 0 && totals.unassigned > 0.0005;
}

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

export default function HarvestLogsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [harvestLogs, setHarvestLogs] = useState<HarvestLog[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [destinationFilter, setDestinationFilter] = useState<DestinationFilter>("all");
  const [editingLog, setEditingLog] = useState<HarvestLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const t = useT();
  const [lang, setLang] = useLanguage();

  const activeFarm = farms.find((f) => f.id === activeFarmId);
  useFarmSelection({ farms, activeFarmId, setActiveFarmId });
  const qualityOptions = useMemo(() => {
    return Array.from(new Set(harvestLogs.map((log) => log.quality).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [harvestLogs]);

  const filteredHarvestLogs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return harvestLogs.filter((log) => {
      if (qualityFilter !== "all" && log.quality !== qualityFilter) return false;
      if (!destinationMatches(log, destinationFilter)) return false;
      if (!normalizedSearch) return true;
      const cropName = log.crop?.[0]?.crop_name?.toLowerCase() || "";
      const zoneName = log.zone?.[0]?.name?.toLowerCase() || "";
      const quality = log.quality?.toLowerCase() || "";
      const notes = log.notes?.toLowerCase() || "";
      return (
        cropName.includes(normalizedSearch) ||
        zoneName.includes(normalizedSearch) ||
        quality.includes(normalizedSearch) ||
        notes.includes(normalizedSearch)
      );
    });
  }, [harvestLogs, qualityFilter, destinationFilter, searchTerm]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const farmRows = await getFarms();
        setFarms(farmRows);
      } catch (err) {
        setError(errMsg(err, t("Failed to load harvest logs")));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const logs = await getHarvestLogs(activeFarmId);
        if (cancelled) return;
        /* Logs cached offline before splits existed have none. */
        setHarvestLogs(logs.map((log) => ({ ...log, splits: log.splits ?? [] })));
      } catch (err) {
        if (!cancelled) setError(errMsg(err, t("Failed to load harvest logs")));
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeFarmId]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const totalQuantity = filteredHarvestLogs.reduce((sum, log) => sum + (log.quantity_kg || 0), 0);
  const totalUnits = filteredHarvestLogs.reduce((sum, log) => sum + (log.quantity_units || 0), 0);
  const destinationTotals = filteredHarvestLogs.reduce(
    (acc, log) => {
      const totals = splitTotals(log.quantity_kg, log.splits);
      acc.EH += totals.EH;
      acc.ORG += totals.ORG;
      acc.unassigned += totals.unassigned;
      if (totals.unassigned > 0.0005) acc.unassignedCount += 1;
      return acc;
    },
    { EH: 0, ORG: 0, unassigned: 0, unassignedCount: 0 }
  );
  const pctOfTotal = (n: number) => (totalQuantity > 0 ? Math.round((n / totalQuantity) * 100) : 0);

  function handleSplitsSaved(logId: string, splits: HarvestSplit[]) {
    setHarvestLogs((prev) => prev.map((log) => (log.id === logId ? { ...log, splits } : log)));
    setEditingLog(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-500">{t("Loading...")}</p>
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 p-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold">{t("No farms yet")}</h1>
          <p className="mt-2 text-zinc-600">{t("Create or join a farm to get started.")}</p>
          <div className="mt-6 space-x-3">
            <Link href="/farm" className="inline-block rounded-lg bg-zinc-900 px-6 py-2 text-white hover:bg-zinc-800">
              {t("Go to Farm")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/farm" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900">
            <ChevronLeft className="w-5 h-5" />
            {t("Back")}
          </Link>
          <h1 className="text-2xl font-bold">{t("Harvest Logs")}</h1>
          <div className="flex items-center gap-3">
            <LanguageToggle lang={lang} onChange={setLang} />
            <button
              onClick={handleSignOut}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              {t("Sign out")}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Farm selector */}
        {farms.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 mb-2">{t("Select Farm")}</label>
            <select
              value={activeFarmId}
              onChange={(e) => setActiveFarmId(e.target.value)}
              className="rounded-lg border border-zinc-300 px-4 py-2 outline-none focus:border-zinc-900"
            >
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">{t("Search")}</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("Crop, zone, quality, notes...")}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">{t("Quality")}</span>
                <select
                  value={qualityFilter}
                  onChange={(e) => setQualityFilter(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                >
                  <option value="all">{t("All qualities")}</option>
                  {qualityOptions.map((quality) => (
                    <option key={quality} value={quality}>
                      {t(quality)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">{t("Destination")}</span>
                <select
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value as DestinationFilter)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                >
                  <option value="all">{t("All destinations")}</option>
                  <option value="eh">{t("Went to EH")}</option>
                  <option value="org">{t("Went to ORG")}</option>
                  <option value="split">{t("Split EH + ORG")}</option>
                  <option value="unassigned">{t("Not assigned")}</option>
                </select>
              </label>
          </div>
        </div>

        {/* Stats */}
        {filteredHarvestLogs.length > 0 && (
          <div className={`mb-6 grid gap-4 ${totalUnits > 0 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-600">{t("Total Harvests (filtered)")}</p>
              <p className="text-3xl font-bold">{filteredHarvestLogs.length}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-600">{t("Total Quantity (kg, filtered)")}</p>
              <p className="text-3xl font-bold">{totalQuantity.toFixed(2)}</p>
            </div>
            {totalUnits > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <p className="text-sm text-zinc-600">{t("Total pieces (filtered)")}</p>
                <p className="text-3xl font-bold">{totalUnits.toLocaleString()}</p>
              </div>
            )}
          </div>
        )}
        {filteredHarvestLogs.length > 0 && totalQuantity > 0 && (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <p className="flex items-center gap-2 text-sm text-zinc-600">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
                {t("To EH (kg)")}
              </p>
              <p className="text-3xl font-bold">{kg(destinationTotals.EH)}</p>
              <p className="text-xs text-zinc-500">{t("{pct}% of total", { pct: pctOfTotal(destinationTotals.EH) })}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <p className="flex items-center gap-2 text-sm text-zinc-600">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
                {t("To ORG (kg)")}
              </p>
              <p className="text-3xl font-bold">{kg(destinationTotals.ORG)}</p>
              <p className="text-xs text-zinc-500">{t("{pct}% of total", { pct: pctOfTotal(destinationTotals.ORG) })}</p>
            </div>
            <button
              type="button"
              onClick={() => setDestinationFilter("unassigned")}
              className="rounded-lg border border-zinc-200 bg-white p-6 text-left hover:border-zinc-400"
            >
              <p className="flex items-center gap-2 text-sm text-zinc-600">
                <span className="h-2.5 w-2.5 rounded-sm bg-zinc-300" />
                {t("Not assigned (kg)")}
              </p>
              <p className="text-3xl font-bold">{kg(destinationTotals.unassigned)}</p>
              <p className="text-xs text-zinc-500">
                {t("{n} harvests to sort", { n: destinationTotals.unassignedCount })}
              </p>
            </button>
          </div>
        )}

        {/* Harvest logs table */}
        {filteredHarvestLogs.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
            <p className="text-zinc-500">
              {harvestLogs.length === 0 ? t("No harvest logs yet.") : t("No harvest logs match the current filters.")}
            </p>
            <Link href="/farm" className="mt-4 inline-block text-zinc-900 hover:text-zinc-700 font-medium">
              {t("Log a harvest →")}
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900">{t("Date")}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900">{t("Crop")}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900">{t("Zone")}</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-900">{t("Quantity")}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900">{t("Quality")}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900">{t("Destination")}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900">{t("Notes")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHarvestLogs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                    <td className="px-6 py-4 text-sm text-zinc-900">{formatDate(log.harvest_date)}</td>
                    <td className="px-6 py-4 text-sm text-zinc-900">
                      {log.crop?.[0]?.crop_name || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {log.zone?.[0]?.name || "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-zinc-900">
                      {log.quantity_units !== null && (
                        <div>{t("{n} pcs", { n: log.quantity_units.toLocaleString() })}</div>
                      )}
                      {log.quantity_kg !== null && (
                        <div className={log.quantity_units !== null ? "text-xs font-normal text-zinc-500" : ""}>
                          {log.weight_estimated ? "≈ " : ""}
                          {log.quantity_kg.toFixed(2)} kg
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      <span className="inline-block px-2 py-1 rounded-full bg-zinc-100 text-zinc-800 text-xs font-medium">
                        {t(log.quality)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <DestinationCell log={log} onEdit={() => setEditingLog(log)} />
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 max-w-xs truncate">
                      {log.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingLog && activeFarmId && (
        <SplitDialog
          farmId={activeFarmId}
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSaved={(splits) => handleSplitsSaved(editingLog.id, splits)}
        />
      )}
    </div>
  );
}

function DestinationCell({ log, onEdit }: { log: HarvestLog; onEdit: () => void }) {
  const t = useT();
  const total = log.quantity_kg ?? 0;
  if (total <= 0) return <span className="text-zinc-400">—</span>;
  const totals = splitTotals(total, log.splits);
  const pct = (n: number) => Math.min(100, (n / total) * 100);

  return (
    <button
      type="button"
      onClick={onEdit}
      className="-mx-2 -my-1 flex w-full min-w-[180px] flex-col gap-1.5 rounded-lg px-2 py-1 text-left hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none"
      aria-label={t("Edit destination")}
    >
      <div className="flex h-2 overflow-hidden rounded-full bg-zinc-200">
        <div className="bg-emerald-600" style={{ width: `${pct(totals.EH)}%` }} />
        <div className="bg-blue-600" style={{ width: `${pct(totals.ORG)}%` }} />
      </div>
      {totals.assigned > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums text-zinc-600">
          {totals.EH > 0 && (
            <span>
              <span className="font-semibold text-emerald-700">EH</span> {kg(totals.EH)} kg
            </span>
          )}
          {totals.ORG > 0 && (
            <span>
              <span className="font-semibold text-blue-700">ORG</span> {kg(totals.ORG)} kg
            </span>
          )}
          {totals.unassigned > 0.0005 && (
            <span className="text-amber-700">{t("{kg} kg not assigned", { kg: kg(totals.unassigned) })}</span>
          )}
        </div>
      ) : (
        <span className="self-start rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
          {t("Not assigned · set")}
        </span>
      )}
    </button>
  );
}

function SplitDialog({
  farmId,
  log,
  onClose,
  onSaved,
}: {
  farmId: string;
  log: HarvestLog;
  onClose: () => void;
  onSaved: (splits: HarvestSplit[]) => void;
}) {
  const t = useT();
  const draftKey = `harvest-split:${log.id}`;
  const baseline = useMemo(() => fieldsFromSplits(log.splits ?? []), [log.splits]);
  const [fields, setFields, clearDraft] = useFormDraft<SplitFields>(draftKey, baseline);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const over = splitIsOver(log.quantity_kg, fields);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") cancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function cancel() {
    discardDraft(draftKey);
    onClose();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (over) return;
    const splits = splitsFromFields(fields);
    try {
      setSaving(true);
      setError("");
      await saveHarvestSplits(farmId, log.id, splits);
      clearDraft();
      onSaved(splits);
    } catch (err) {
      setError(errMsg(err, t("Failed to save")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <form
        onSubmit={handleSave}
        role="dialog"
        aria-modal="true"
        aria-labelledby="split-dialog-title"
        className="max-h-full w-full max-w-md space-y-5 overflow-auto rounded-3xl bg-white p-6 shadow-xl"
      >
        <div>
          <h2 id="split-dialog-title" className="text-xl font-semibold">
            {t("Where did this harvest go?")}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {[log.crop?.[0]?.crop_name, log.zone?.[0]?.name, formatDate(log.harvest_date)].filter(Boolean).join(" · ")}
          </p>
        </div>

        <HarvestSplitFields
          totalKg={log.quantity_kg}
          estimated={!!log.weight_estimated}
          value={fields}
          onChange={setFields}
        />

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={cancel}
            className="rounded-2xl border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={saving || over}
            className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t("Saving...") : t("Save")}
          </button>
        </div>
      </form>
    </div>
  );
}
