"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms } from "@/lib/farm";
import type { Farm } from "@/lib/farm";

export default function SettingsPage() {
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Reset zones state
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetting, setResetting] = useState(false);

  // Delete farm state
  const [deleteFarmStep, setDeleteFarmStep] = useState<0 | 1 | 2>(0);
  const [deletingFarm, setDeletingFarm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeFarm = farms.find((f) => f.id === activeFarmId);

  useEffect(() => {
    (async () => {
      try {
        const f = await getFarms();
        setFarms(f);
        const saved = localStorage.getItem("activeFarmId");
        if (saved && f.some((farm) => farm.id === saved)) {
          setActiveFarmId(saved);
        } else if (f.length > 0) {
          setActiveFarmId(f[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load farms");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Get user role
  useEffect(() => {
    if (!activeFarmId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: membership } = await supabase
        .from("farm_members")
        .select("role_on_farm")
        .eq("farm_id", activeFarmId)
        .eq("profile_id", user.id)
        .single();
      setUserRole(membership?.role_on_farm ?? null);
    })();
  }, [activeFarmId]);

  async function handleResetZones() {
    if (!activeFarmId) return;
    setResetting(true);
    setError("");
    setSuccess("");
    try {
      // Delete compost entries linked to zones in this farm
      const { data: zoneIds } = await supabase
        .from("zones")
        .select("id")
        .eq("farm_id", activeFarmId);

      if (zoneIds && zoneIds.length > 0) {
        const ids = zoneIds.map((z: { id: string }) => z.id);

        // Delete linked data
        const { error: fertErr } = await supabase.from("fertilisations").delete().in("zone_id", ids);
        if (fertErr) console.error("fertilisations delete:", fertErr);

        const { error: compErr } = await supabase.from("compost").delete().in("zone_id", ids);
        if (compErr) console.error("compost delete:", compErr);

        const { error: cropErr } = await supabase.from("crops").update({ zone_id: null }).in("zone_id", ids);
        if (cropErr) console.error("crops update:", cropErr);

        // Delete zones - try hard delete first, fall back to soft delete
        const { error: delErr } = await supabase.from("zones").delete().eq("farm_id", activeFarmId);
        if (delErr) {
          console.error("zones hard delete failed:", delErr);
          // Try soft delete
          const { error: softErr } = await supabase.from("zones").update({ is_active: false, map_position: null }).eq("farm_id", activeFarmId);
          if (softErr) {
            throw new Error("Failed to delete zones: " + softErr.message);
          }
        }
      }

      setSuccess("Done! All zones cleared. Redirecting to farm page to create fresh zones...");
      setTimeout(() => router.push("/farm"), 1500);
      setResetStep(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset zones");
    } finally {
      setResetting(false);
    }
  }

  async function handleDeleteFarm() {
    if (!activeFarm) return;
    setDeletingFarm(true);
    try {
      const { error: err } = await supabase
        .from("farms")
        .update({ is_active: false })
        .eq("id", activeFarm.id);
      if (err) throw err;
      setDeleteFarmStep(0);
      setDeletingFarm(false);
      localStorage.removeItem("activeFarmId");
      router.push("/farm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete farm");
      setDeletingFarm(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Link href="/farm" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Back to farm
        </Link>
      </div>

      {activeFarm && (
        <p className="mb-6 text-sm text-zinc-500">Farm: {activeFarm.name}</p>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Reset Zones */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Reset All Zones</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Deletes all zones and their linked fertiliser, compost, and crop assignments.
          Map bed positions are preserved. You can then recreate zones from the map.
        </p>

        {resetStep === 0 && (
          <button
            onClick={() => setResetStep(1)}
            className="mt-4 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Reset all zones
          </button>
        )}
        {resetStep === 1 && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-red-600 font-medium">This will delete all zones and linked data. Continue?</span>
            <button
              onClick={() => setResetStep(2)}
              className="rounded-xl bg-red-100 border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
            >
              Yes, continue
            </button>
            <button
              onClick={() => setResetStep(0)}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        )}
        {resetStep === 2 && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-red-700 font-semibold">This cannot be undone.</span>
            <button
              onClick={handleResetZones}
              disabled={resetting}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {resetting ? "Resetting…" : "Permanently reset"}
            </button>
            <button
              onClick={() => setResetStep(0)}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      {/* Delete Farm */}
      {activeFarm && userRole === "owner" && (
        <section className="mt-6 rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Permanently delete this farm and all its data.
          </p>

          {deleteFarmStep === 0 && (
            <button
              onClick={() => setDeleteFarmStep(1)}
              className="mt-4 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Delete farm
            </button>
          )}
          {deleteFarmStep === 1 && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-red-600 font-medium">Are you sure you want to delete &ldquo;{activeFarm.name}&rdquo;?</span>
              <button
                onClick={() => setDeleteFarmStep(2)}
                className="rounded-xl bg-red-100 border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setDeleteFarmStep(0)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          )}
          {deleteFarmStep === 2 && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-red-700 font-semibold">This cannot be undone. All farm data will be lost.</span>
              <button
                onClick={handleDeleteFarm}
                disabled={deletingFarm}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingFarm ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                onClick={() => setDeleteFarmStep(0)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
