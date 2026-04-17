"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms } from "@/lib/farm";
import type { Farm } from "@/lib/farm";
import { downloadCsvFile, toFileSlug } from "@/app/farm/utils";
import { Download } from "lucide-react";

type CsvValue = string | number | boolean | null | undefined;

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
  const [exporting, setExporting] = useState(false);

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
      const res = await fetch("/api/zones/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farm_id: activeFarmId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");

      setSuccess(`Done! Deleted ${data.deleted} zones. Redirecting...`);
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

  async function handleExportFarmData() {
    if (!activeFarmId || !activeFarm) return;
    setExporting(true);
    setError("");
    setSuccess("");
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const farmSlug = toFileSlug(activeFarm.name, "farm");

      const exportDefs: Array<{
        table: string;
        filename: string;
        headers: string[];
        fields: string[];
      }> = [
        {
          table: "tasks",
          filename: `${farmSlug}-tasks-all-${stamp}.csv`,
          headers: ["Title", "Description", "Status", "Priority", "Due Date", "Due Time", "Assigned To", "Created At"],
          fields: ["title", "description", "status", "priority", "due_date", "due_time", "assigned_to", "created_at"],
        },
        {
          table: "harvests",
          filename: `${farmSlug}-harvest-logs-all-${stamp}.csv`,
          headers: ["Harvest Date", "Crop ID", "Zone ID", "Quantity (kg)", "Quality", "Notes", "Created At"],
          fields: ["harvest_date", "crop_id", "zone_id", "quantity_kg", "quality", "notes", "created_at"],
        },
        {
          table: "work_hours",
          filename: `${farmSlug}-work-hours-all-${stamp}.csv`,
          headers: ["Date", "Worker", "Hours", "Role", "Notes", "Created At"],
          fields: ["date", "worker_name", "hours", "role", "notes", "created_at"],
        },
        {
          table: "seedlings",
          filename: `${farmSlug}-seedlings-all-${stamp}.csv`,
          headers: ["Type", "Date", "Plant", "Variety", "Quantity", "Germination", "Germination Date", "Healthy Seedlings", "Successional Sowing", "Yields", "Row Location", "Notes", "Created At"],
          fields: ["type", "date", "plant", "variety", "quantity", "germination", "germination_date", "healthy_seedlings", "successional_sowing", "yields", "row_location", "notes", "created_at"],
        },
        {
          table: "seed_collection",
          filename: `${farmSlug}-seed-collection-all-${stamp}.csv`,
          headers: ["Plant", "Distance", "Notes", "Additional Notes", "Created At"],
          fields: ["plant", "distance", "notes", "notes2", "created_at"],
        },
        {
          table: "expenses",
          filename: `${farmSlug}-expenses-all-${stamp}.csv`,
          headers: ["Category", "Amount", "Vendor", "Expense Date", "Notes", "Created At"],
          fields: ["category", "amount", "vendor_name", "expense_date", "notes", "created_at"],
        },
        {
          table: "sales",
          filename: `${farmSlug}-sales-all-${stamp}.csv`,
          headers: ["Sale Date", "Buyer", "Crop ID", "Quantity (kg)", "Price per kg", "Total Amount", "Notes", "Created At"],
          fields: ["sale_date", "buyer_name", "crop_id", "quantity_kg", "price_per_kg", "total_amount", "notes", "created_at"],
        },
        {
          table: "pest_logs",
          filename: `${farmSlug}-pest-logs-all-${stamp}.csv`,
          headers: ["Logged Date", "Pest Name", "Severity", "Description", "Action Taken", "Crop ID", "Zone ID", "Created At"],
          fields: ["logged_date", "pest_name", "severity", "description", "action_taken", "crop_id", "zone_id", "created_at"],
        },
        {
          table: "compost",
          filename: `${farmSlug}-compost-all-${stamp}.csv`,
          headers: ["Date", "Compost Type", "Ready To Use Date", "Materials Used", "Place", "Zone ID", "Notes", "Created At"],
          fields: ["date", "compost_type", "ready_to_use_date", "materials_used", "place", "zone_id", "notes", "created_at"],
        },
        {
          table: "fertilisations",
          filename: `${farmSlug}-fertilisations-all-${stamp}.csv`,
          headers: ["Date", "Fertiliser", "Ready To Use", "Bin Colour", "Plants", "Zone ID", "Notes", "Created At"],
          fields: ["date", "fertiliser", "ready_to_use", "bin_colour", "plants", "zone_id", "notes", "created_at"],
        },
      ];

      let generated = 0;
      for (const def of exportDefs) {
        const { data, error: fetchError } = await supabase
          .from(def.table)
          .select(def.fields.join(","))
          .eq("farm_id", activeFarmId);
        if (fetchError) throw fetchError;
        const typedRows: Array<Record<string, CsvValue>> = Array.isArray(data)
          ? (data as unknown as Array<Record<string, CsvValue>>)
          : [];
        const rows = typedRows.map((row) => def.fields.map((field) => row[field]));
        if (rows.length > 0) {
          downloadCsvFile(def.filename, def.headers, rows);
          generated += 1;
        }
      }
      setSuccess(generated > 0 ? `Export complete. Downloaded ${generated} CSV files.` : "No farm data found to export.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export data");
    } finally {
      setExporting(false);
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

      <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Data Export</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Download all data for this farm as CSV files for backup, reporting, or offline work.
        </p>
        <button
          onClick={handleExportFarmData}
          disabled={!activeFarmId || exporting}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : "Export farm data (CSV)"}
        </button>
      </section>

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
