"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms, getHarvestLogs } from "@/lib/farm";
import type { Farm, HarvestLog } from "@/lib/farm";
import { formatDate } from "@/app/farm/utils";
import { ChevronLeft } from "lucide-react";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useT, useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

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
  }, [harvestLogs, qualityFilter, searchTerm]);

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
        setHarvestLogs(logs);
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
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>
        </div>

        {/* Stats */}
        {filteredHarvestLogs.length > 0 && (
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-600">{t("Total Harvests (filtered)")}</p>
              <p className="text-3xl font-bold">{filteredHarvestLogs.length}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-600">{t("Total Quantity (kg, filtered)")}</p>
              <p className="text-3xl font-bold">{totalQuantity.toFixed(2)}</p>
            </div>
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
                  <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-900">{t("Quantity (kg)")}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900">{t("Quality")}</th>
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
                      {log.quantity_kg.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      <span className="inline-block px-2 py-1 rounded-full bg-zinc-100 text-zinc-800 text-xs font-medium">
                        {t(log.quality)}
                      </span>
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
    </div>
  );
}
