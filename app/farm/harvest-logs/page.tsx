"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms, getHarvestLogs } from "@/lib/farm";
import type { Farm, HarvestLog } from "@/lib/farm";
import { formatDate } from "@/app/farm/utils";
import { ChevronLeft } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const activeFarm = farms.find((f) => f.id === activeFarmId);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const farmRows = await getFarms();
        setFarms(farmRows);
        if (farmRows.length > 0) {
          setActiveFarmId(farmRows[0].id);
          const logs = await getHarvestLogs(farmRows[0].id);
          setHarvestLogs(logs);
        }
      } catch (err) {
        setError(errMsg(err, "Failed to load harvest logs"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const logs = await getHarvestLogs(activeFarmId);
        setHarvestLogs(logs);
      } catch (err) {
        setError(errMsg(err, "Failed to load harvest logs"));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeFarmId]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const totalQuantity = harvestLogs.reduce((sum, log) => sum + (log.quantity_kg || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 p-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold">No farms yet</h1>
          <p className="mt-2 text-zinc-600">Create or join a farm to get started.</p>
          <div className="mt-6 space-x-3">
            <Link href="/farm" className="inline-block rounded-lg bg-zinc-900 px-6 py-2 text-white hover:bg-zinc-800">
              Go to Farm
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
            Back
          </Link>
          <h1 className="text-2xl font-bold">Harvest Logs</h1>
          <button
            onClick={handleSignOut}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Farm selector */}
        {farms.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 mb-2">Select Farm</label>
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

        {/* Stats */}
        {harvestLogs.length > 0 && (
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-600">Total Harvests</p>
              <p className="text-3xl font-bold">{harvestLogs.length}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-600">Total Quantity (kg)</p>
              <p className="text-3xl font-bold">{totalQuantity.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Harvest logs table */}
        {harvestLogs.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
            <p className="text-zinc-500">No harvest logs yet.</p>
            <Link href="/farm" className="mt-4 inline-block text-zinc-900 hover:text-zinc-700 font-medium">
              Log a harvest →
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900">Crop</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900">Zone</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-900">Quantity (kg)</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900">Quality</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900">Notes</th>
                </tr>
              </thead>
              <tbody>
                {harvestLogs.map((log) => (
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
                        {log.quality}
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
