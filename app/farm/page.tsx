"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getFarms,
  getZones,
  getCrops,
  getTasks,
  getActivities,
  getExpenses,
  getAssets,
  getPests,
} from "@/lib/farm";
import type { Farm, Zone, Crop, Task, Activity, Expense, Asset, Pest } from "@/lib/farm";
import { formatDate, formatMoney, badgeClass } from "@/app/farm/utils";
import { CropForm } from "@/app/farm/components/CropForm";
import { TaskForm } from "@/app/farm/components/TaskForm";
import { HarvestForm } from "@/app/farm/components/HarvestForm";
import { ExpenseForm } from "@/app/farm/components/ExpenseForm";
import { AssetForm } from "@/app/farm/components/AssetForm";
import { PestForm } from "@/app/farm/components/PestForm";
import { ZoneForm } from "@/app/farm/components/ZoneForm";
import { ActivityFeed } from "@/app/farm/components/ActivityFeed";
import type { CropFormData } from "@/app/farm/components/CropForm";
import type { TaskFormData } from "@/app/farm/components/TaskForm";
import type { HarvestFormData } from "@/app/farm/components/HarvestForm";
import type { ExpenseFormData } from "@/app/farm/components/ExpenseForm";
import type { AssetFormData } from "@/app/farm/components/AssetForm";
import type { PestFormData } from "@/app/farm/components/PestForm";
import type { ZoneFormData } from "@/app/farm/components/ZoneForm";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

export default function FarmPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pests, setPests] = useState<Pest[]>([]);

  const [activeFarmId, setActiveFarmId] = useState<string>("");
  const [activeForm, setActiveForm] = useState<"crop" | "task" | "harvest" | "expense" | "asset" | "pest" | "zone" | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingFarm, setEditingFarm] = useState(false);
  const [farmEditForm, setFarmEditForm] = useState({ name: "", location: "", size_acres: "" });
  const [savingFarm, setSavingFarm] = useState(false);
  const router = useRouter();
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskForm, setEditingTaskForm] = useState<TaskFormData | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [error, setError] = useState<string>("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpenseForm, setEditingExpenseForm] = useState<ExpenseFormData | null>(null);
  const [savingExpenseId, setSavingExpenseId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function startEditFarm() {
    if (!activeFarm) return;
    setFarmEditForm({
      name: activeFarm.name,
      location: activeFarm.location ?? "",
      size_acres: activeFarm.size_acres?.toString() ?? "",
    });
    setEditingFarm(true);
  }

  async function handleSaveFarm() {
    if (!activeFarmId) return;
    try {
      setSavingFarm(true);
      setError("");
      const name = farmEditForm.name.trim();
      if (!name) throw new Error("Farm name is required.");

      const { error: updateError } = await supabase
        .from("farms")
        .update({
          name,
          location: farmEditForm.location.trim() || null,
          size_acres: farmEditForm.size_acres ? Number(farmEditForm.size_acres) : null,
        })
        .eq("id", activeFarmId);
      if (updateError) throw updateError;

      await loadFarms();
      setEditingFarm(false);
    } catch (err) {
      setError(errMsg(err, "Failed to save farm"));
    } finally {
      setSavingFarm(false);
    }
  }

  async function loadFarms() {
    const farmRows = await getFarms();
    setFarms(farmRows);
    if (!activeFarmId && farmRows.length > 0) {
      setActiveFarmId(farmRows[0].id);
    }
  }

  async function loadFarmData(farmId: string) {
    const [zoneRows, cropRows, taskRows, activityRows, expenseRows, assetRows, pestRows] = await Promise.all([
      getZones(farmId),
      getCrops(farmId),
      getTasks(farmId),
      getActivities(farmId),
      getExpenses(farmId),
      getAssets(farmId),
      getPests(farmId),
    ]);

    setZones(zoneRows);
    setCrops(cropRows);
    setTasks(taskRows);
    setActivities(activityRows);
    setExpenses(expenseRows);
    setAssets(assetRows);
    setPests(pestRows);
  }

  async function refreshAll() {
    try {
      setError("");
      setLoading(true);
      await loadFarms();
    } catch (err) {
      setError(errMsg(err, "Failed to load farms"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;

    const run = async () => {
      try {
        setError("");
        setLoading(true);
        await loadFarmData(activeFarmId);
      } catch (err) {
        setError(errMsg(err, "Failed to load farm data"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [activeFarmId]);

  const activeFarm = useMemo(
    () => farms.find((farm) => farm.id === activeFarmId) ?? null,
    [farms, activeFarmId]
  );

  const today = new Date().toISOString().slice(0, 10);

  const tasksToday = tasks.filter(
    (task) =>
      task.due_date === today &&
      task.status !== "done" &&
      task.status !== "cancelled"
  );

  const openTasks = tasks.filter(
    (task) => task.status === "todo" || task.status === "in_progress"
  );

  const completedTasks = tasks.filter(
    (task) => task.status === "done" || task.status === "cancelled"
  );

  const readyToHarvest = crops.filter((crop) => crop.status === "harvest_ready");

  const forecastRevenue = crops.reduce((sum, crop) => {
    return sum + Number(crop.estimated_yield_kg ?? 0) * Number(crop.expected_sale_price_per_kg ?? 0);
  }, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const defaultZoneId = zones.length === 1 ? zones[0].id : "";
  const defaultCropId = crops.length === 1 ? crops[0].id : "";

  async function handleCreateCrop(data: CropFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      const cropName = data.crop_name.trim();
      if (!cropName) throw new Error("Crop name is required.");

      const { error: insertError } = await supabase.from("crops").insert({
        farm_id: activeFarmId,
        zone_id: data.zone_id || null,
        crop_name: cropName,
        variety: data.variety.trim() || null,
        status: data.status,
        planted_on: data.planted_on || null,
        expected_harvest_start: data.expected_harvest_start || null,
        estimated_yield_kg: data.estimated_yield_kg ? Number(data.estimated_yield_kg) : null,
        expected_sale_price_per_kg: data.expected_sale_price_per_kg
          ? Number(data.expected_sale_price_per_kg)
          : null,
        is_active: true,
      });
      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "crop_created",
        title: `${cropName} added`,
        meta: data.zone_id ? "Crop linked to zone" : "Crop created",
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to create crop"));
      return false;
    }
  }

  async function handleCreateTask(data: TaskFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      const title = data.title.trim();
      if (!title) throw new Error("Task title is required.");

      const { error: insertError } = await supabase.from("tasks").insert({
        farm_id: activeFarmId,
        zone_id: data.zone_id || null,
        crop_id: data.crop_id || null,
        title,
        description: data.description.trim() || null,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date || null,
        proof_required: data.proof_required,
      });
      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "task_created",
        title: `${title} created`,
        meta: data.due_date ? `Due ${data.due_date}` : "Task added",
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to create task"));
      return false;
    }
  }

  async function handleCompleteTask(task: Task) {
    if (!activeFarmId) return;
    try {
      setCompletingTaskId(task.id);
      setError("");

      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", task.id);
      if (updateError) throw updateError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "task_completed",
        title: `${task.title} completed`,
        meta: task.crop?.[0]?.crop_name
          ? `Linked to ${task.crop[0].crop_name}`
          : "Task marked done",
      });

      await loadFarmData(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to complete task"));
    } finally {
      setCompletingTaskId(null);
    }
  }

  async function handleUpdateTask(id: string, data: TaskFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setSavingTaskId(id);
      setError("");
      const title = data.title.trim();
      if (!title) throw new Error("Task title is required.");

      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          title,
          description: data.description.trim() || null,
          zone_id: data.zone_id || null,
          crop_id: data.crop_id || null,
          status: data.status,
          priority: data.priority,
          due_date: data.due_date || null,
          proof_required: data.proof_required,
        })
        .eq("id", id);
      if (updateError) throw updateError;

      await loadFarmData(activeFarmId);
      setEditingTaskId(null);
      setEditingTaskForm(null);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to update task"));
      return false;
    } finally {
      setSavingTaskId(null);
    }
  }

  async function handleDeleteTask(id: string) {
    if (!activeFarmId) return;
    try {
      setDeletingTaskId(id);
      setError("");
      const { error: deleteError } = await supabase.from("tasks").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await loadFarmData(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to delete task"));
    } finally {
      setDeletingTaskId(null);
    }
  }

  async function handleLogHarvest(data: HarvestFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.crop_id) throw new Error("Choose a crop before logging harvest.");
      if (!data.harvest_date) throw new Error("Harvest date is required.");
      if (!data.quantity_kg) throw new Error("Harvest quantity is required.");

      const selectedCrop = crops.find((crop) => crop.id === data.crop_id) ?? null;
      const harvestQty = Number(data.quantity_kg);

      const { error: harvestError } = await supabase.from("harvests").insert({
        farm_id: activeFarmId,
        crop_id: data.crop_id,
        zone_id: data.zone_id || null,
        harvest_date: data.harvest_date,
        quantity_kg: harvestQty,
        quality: data.quality,
        notes: data.notes.trim() || null,
      });
      if (harvestError) throw harvestError;

      const nextActualYield = Number(selectedCrop?.actual_yield_kg ?? 0) + harvestQty;
      const cropUpdates: Record<string, unknown> = { actual_yield_kg: nextActualYield };

      if (selectedCrop?.status !== "harvested") {
        cropUpdates.status = "harvested";
        cropUpdates.actual_harvest_date = data.harvest_date;
      }

      const { error: cropUpdateError } = await supabase
        .from("crops")
        .update(cropUpdates)
        .eq("id", data.crop_id);
      if (cropUpdateError) throw cropUpdateError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "harvest_logged",
        title: `${selectedCrop?.crop_name ?? "Harvest"} logged`,
        meta: `${harvestQty} kg · ${data.quality}`,
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to log harvest"));
      return false;
    }
  }

  async function handleLogExpense(data: ExpenseFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.expense_date) throw new Error("Expense date is required.");

      const { error: insertError } = await supabase.from("expenses").insert({
        farm_id: activeFarmId,
        zone_id: data.zone_id || null,
        crop_id: data.crop_id || null,
        category: data.category,
        amount: data.amount ? Number(data.amount) : null,
        expense_date: data.expense_date,
        notes: data.notes || null,
        vendor_name: data.vendor_name || null,
      });
      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "expense_logged",
        title: `${data.category} expense logged`,
        meta: data.amount ? formatMoney(Number(data.amount)) : "amount TBC",
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to log expense"));
      return false;
    }
  }

  async function handleUpdateExpense(id: string, data: ExpenseFormData): Promise<boolean> {
    try {
      setError("");
      setSavingExpenseId(id);
      const { error: updateError } = await supabase.from("expenses").update({
        category: data.category,
        amount: data.amount ? Number(data.amount) : null,
        expense_date: data.expense_date,
        notes: data.notes || null,
        vendor_name: data.vendor_name || null,
        zone_id: data.zone_id || null,
        crop_id: data.crop_id || null,
      }).eq("id", id);
      if (updateError) throw updateError;
      await loadFarmData(activeFarmId);
      setEditingExpenseId(null);
      setEditingExpenseForm(null);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to update expense"));
      return false;
    } finally {
      setSavingExpenseId(null);
    }
  }

  async function handleDeleteExpense(id: string) {
    try {
      setError("");
      setDeletingExpenseId(id);
      const { error: deleteError } = await supabase.from("expenses").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await loadFarmData(activeFarmId);
      setConfirmDeleteExpenseId(null);
    } catch (err) {
      setError(errMsg(err, "Failed to delete expense"));
    } finally {
      setDeletingExpenseId(null);
    }
  }

  async function handleLogAsset(data: AssetFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.name.trim()) throw new Error("Asset name is required.");

      const { error: insertError } = await supabase.from("assets").insert({
        farm_id: activeFarmId,
        name: data.name.trim(),
        category: data.category,
        purchase_date: data.purchase_date || null,
        purchase_price: data.purchase_price ? Number(data.purchase_price) : null,
        paid_by: data.paid_by.trim() || null,
        condition: data.condition,
        notes: data.notes.trim() || null,
      });
      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "asset_logged",
        title: `${data.name.trim()} logged`,
        meta: [data.category, data.paid_by.trim() ? `paid by ${data.paid_by.trim()}` : null]
          .filter(Boolean)
          .join(" · "),
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to log asset"));
      return false;
    }
  }

  async function handleLogPest(data: PestFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.pest_name.trim()) throw new Error("Pest name is required.");
      if (!data.logged_date) throw new Error("Date spotted is required.");

      const { error: insertError } = await supabase.from("pest_logs").insert({
        farm_id: activeFarmId,
        pest_name: data.pest_name.trim(),
        severity: data.severity,
        description: data.description.trim() || null,
        action_taken: data.action_taken.trim() || null,
        logged_date: data.logged_date,
        crop_id: data.crop_id || null,
        zone_id: data.zone_id || null,
      });
      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "pest_logged",
        title: `${data.pest_name.trim()} spotted`,
        meta: `${data.severity} severity${data.action_taken.trim() ? ` · ${data.action_taken.trim()}` : ""}`,
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to log pest issue"));
      return false;
    }
  }

  async function handleCreateZone(data: ZoneFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      const name = data.name.trim();
      if (!name) throw new Error("Zone name is required.");

      const { error: insertError } = await supabase.from("zones").insert({
        farm_id: activeFarmId,
        name,
        code: data.code.trim() || null,
        size_acres: data.size_acres ? Number(data.size_acres) : null,
        is_active: true,
      });
      if (insertError) throw insertError;

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to add zone"));
      return false;
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              {editingFarm ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={farmEditForm.name}
                    onChange={(e) => setFarmEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-2 text-2xl font-semibold outline-none focus:border-zinc-900"
                    placeholder="Farm name"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={farmEditForm.location}
                      onChange={(e) => setFarmEditForm((prev) => ({ ...prev, location: e.target.value }))}
                      className="flex-1 rounded-2xl border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder="Location"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={farmEditForm.size_acres}
                      onChange={(e) => setFarmEditForm((prev) => ({ ...prev, size_acres: e.target.value }))}
                      className="w-32 rounded-2xl border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder="Acres"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveFarm}
                      disabled={savingFarm || !farmEditForm.name.trim()}
                      className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
                    >
                      {savingFarm ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingFarm(false)}
                      className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {activeFarm?.name ?? "Farm Manager"}
                  </h1>
                  <p className="mt-3 text-sm text-zinc-600 sm:text-base">
                    {activeFarm?.location || "No location set"}
                    {activeFarm?.size_acres ? ` · ${activeFarm.size_acres} acres` : ""}
                  </p>
                  <button
                    onClick={startEditFarm}
                    className="mt-3 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {farms.map((farm) => {
                const isActive = farm.id === activeFarmId;
                return (
                  <button
                    key={farm.id}
                    onClick={() => setActiveFarmId(farm.id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {farm.name}
                  </button>
                );
              })}
              <Link
                href="/farm/planting-plan"
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Planting plan
              </Link>
              <Link
                href="/farm/seedlings"
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Seedlings
              </Link>
              <Link
                href="/plants"
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Plants
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading && !activeFarm ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            Loading...
          </div>
        ) : null}

        {!loading && !activeFarm ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            No farms found. Add the seed SQL in Supabase first.
          </div>
        ) : null}

        {activeFarm ? (
          <>
            <section className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Tasks today
                </p>
                <p className="mt-3 text-3xl font-semibold">{tasksToday.length}</p>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Open tasks
                </p>
                <p className="mt-3 text-3xl font-semibold">{openTasks.length}</p>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Ready to harvest
                </p>
                <p className="mt-3 text-3xl font-semibold">{readyToHarvest.length}</p>
              </div>
            </section>

            <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Open tasks</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    All todo and in-progress tasks, due soonest first.
                  </p>
                </div>
                <span className="text-sm text-zinc-500">{openTasks.length} open</span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {openTasks.length === 0 ? (
                  <p className="text-sm text-zinc-500">No open tasks.</p>
                ) : (
                  openTasks.map((task) => {
                    const isCompleting = completingTaskId === task.id;
                    const isDeleting = deletingTaskId === task.id;
                    const isSaving = savingTaskId === task.id;
                    const isEditing = editingTaskId === task.id;
                    const isToday = task.due_date === today;
                    return (
                      <div key={task.id} className="rounded-2xl border border-zinc-200 p-4">
                        {isEditing && editingTaskForm ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editingTaskForm.title}
                              onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, title: e.target.value } : prev)}
                              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder="Task title"
                            />
                            <textarea
                              value={editingTaskForm.description}
                              onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder="Description"
                              rows={2}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={editingTaskForm.status}
                                onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, status: e.target.value } : prev)}
                                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              >
                                <option value="todo">todo</option>
                                <option value="in_progress">in_progress</option>
                                <option value="done">done</option>
                              </select>
                              <select
                                value={editingTaskForm.priority}
                                onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, priority: e.target.value } : prev)}
                                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              >
                                <option value="low">low</option>
                                <option value="medium">medium</option>
                                <option value="high">high</option>
                                <option value="urgent">urgent</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={editingTaskForm.zone_id}
                                onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, zone_id: e.target.value } : prev)}
                                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              >
                                <option value="">No zone</option>
                                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                              </select>
                              <select
                                value={editingTaskForm.crop_id}
                                onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, crop_id: e.target.value } : prev)}
                                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              >
                                <option value="">General task</option>
                                {crops.map((c) => <option key={c.id} value={c.id}>{c.crop_name}{c.variety ? ` · ${c.variety}` : ""}</option>)}
                              </select>
                            </div>
                            <input
                              type="date"
                              value={editingTaskForm.due_date}
                              onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, due_date: e.target.value } : prev)}
                              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                            />
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editingTaskForm.proof_required}
                                onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, proof_required: e.target.checked } : prev)}
                              />
                              Photo proof required
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateTask(task.id, editingTaskForm)}
                                disabled={isSaving || !editingTaskForm.title.trim()}
                                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
                              >
                                {isSaving ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => { setEditingTaskId(null); setEditingTaskForm(null); }}
                                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(task.status)}`}>
                                {task.status}
                              </span>
                              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                                {task.priority}
                              </span>
                              {isToday ? (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                  today
                                </span>
                              ) : null}
                              {task.proof_required ? (
                                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                                  photo proof
                                </span>
                              ) : null}
                            </div>

                            <h3 className="mt-3 text-base font-semibold">{task.title}</h3>

                            <div className="mt-2 text-sm text-zinc-600">
                              {task.zone?.[0]?.name ?? "No zone"}
                              <span className="mx-2">·</span>
                              {task.crop?.[0]?.crop_name ?? "General task"}
                              <span className="mx-2">·</span>
                              {formatDate(task.due_date)}
                            </div>

                            {task.description ? (
                              <p className="mt-2 text-sm text-zinc-500">{task.description}</p>
                            ) : null}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                onClick={() => handleCompleteTask(task)}
                                disabled={isCompleting || isDeleting}
                                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isCompleting ? "Completing..." : "Mark done"}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditingTaskForm({
                                    title: task.title,
                                    description: task.description ?? "",
                                    zone_id: task.zone_id ?? "",
                                    crop_id: task.crop_id ?? "",
                                    status: task.status ?? "todo",
                                    priority: task.priority ?? "medium",
                                    due_date: task.due_date ?? "",
                                    proof_required: task.proof_required ?? false,
                                  });
                                }}
                                disabled={isCompleting || isDeleting}
                                className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={isCompleting || isDeleting}
                                className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <div>
                  <h2 className="text-xl font-semibold">Completed tasks</h2>
                  <p className="mt-1 text-sm text-zinc-500">{completedTasks.length} done or cancelled</p>
                </div>
                <span className="text-sm text-zinc-500">{showCompleted ? "Hide" : "Show"}</span>
              </button>

              {showCompleted ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {completedTasks.length === 0 ? (
                    <p className="text-sm text-zinc-500">No completed tasks yet.</p>
                  ) : (
                    completedTasks.map((task) => {
                      const isDeleting = deletingTaskId === task.id;
                      return (
                        <div key={task.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(task.status)}`}>
                              {task.status}
                            </span>
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                              {task.priority}
                            </span>
                          </div>

                          <h3 className="mt-3 text-base font-medium text-zinc-600 line-through">{task.title}</h3>

                          <div className="mt-2 text-sm text-zinc-400">
                            {task.zone?.[0]?.name ?? "No zone"}
                            <span className="mx-2">·</span>
                            {task.crop?.[0]?.crop_name ?? "General task"}
                            <span className="mx-2">·</span>
                            {formatDate(task.due_date)}
                          </div>

                          {task.description ? (
                            <p className="mt-2 text-sm text-zinc-400">{task.description}</p>
                          ) : null}

                          <div className="mt-3">
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              disabled={isDeleting}
                              className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
            </section>

            <div className="mb-6 flex flex-wrap gap-3">
              {(
                [
                  { key: "crop", label: "New crop" },
                  { key: "task", label: "New task" },
                  { key: "harvest", label: "Log harvest" },
                  { key: "expense", label: "Log expense" },
                  { key: "asset", label: "Log asset" },
                  { key: "pest", label: "Log pest" },
                  { key: "zone", label: "Add zone" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveForm(activeForm === key ? null : key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeForm === key
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeForm === "crop" && (
              <div className="mb-6 max-w-sm">
                <CropForm
                  zones={zones}
                  defaultZoneId={defaultZoneId}
                  onSubmit={async (data) => {
                    const ok = await handleCreateCrop(data);
                    if (ok) setActiveForm(null);
                    return ok;
                  }}
                />
              </div>
            )}
            {activeForm === "task" && (
              <div className="mb-6 max-w-sm">
                <TaskForm
                  zones={zones}
                  crops={crops}
                  defaultZoneId={defaultZoneId}
                  onSubmit={async (data) => {
                    const ok = await handleCreateTask(data);
                    if (ok) setActiveForm(null);
                    return ok;
                  }}
                />
              </div>
            )}
            {activeForm === "harvest" && (
              <div className="mb-6 max-w-sm">
                <HarvestForm
                  zones={zones}
                  crops={crops}
                  defaultCropId={defaultCropId}
                  defaultZoneId={defaultZoneId}
                  onSubmit={async (data) => {
                    const ok = await handleLogHarvest(data);
                    if (ok) setActiveForm(null);
                    return ok;
                  }}
                />
              </div>
            )}
            {activeForm === "expense" && (
              <div className="mb-6 max-w-sm">
                <ExpenseForm
                  zones={zones}
                  crops={crops}
                  defaultZoneId={defaultZoneId}
                  onSubmit={async (data) => {
                    const ok = await handleLogExpense(data);
                    if (ok) setActiveForm(null);
                    return ok;
                  }}
                />
              </div>
            )}
            {activeForm === "asset" && (
              <div className="mb-6 max-w-sm">
                <AssetForm
                  onSubmit={async (data) => {
                    const ok = await handleLogAsset(data);
                    if (ok) setActiveForm(null);
                    return ok;
                  }}
                />
              </div>
            )}
            {activeForm === "pest" && (
              <div className="mb-6 max-w-sm">
                <PestForm
                  zones={zones}
                  crops={crops}
                  defaultZoneId={defaultZoneId}
                  onSubmit={async (data) => {
                    const ok = await handleLogPest(data);
                    if (ok) setActiveForm(null);
                    return ok;
                  }}
                />
              </div>
            )}
            {activeForm === "zone" && (
              <div className="mb-6 max-w-sm">
                <ZoneForm
                  onSubmit={async (data) => {
                    const ok = await handleCreateZone(data);
                    if (ok) setActiveForm(null);
                    return ok;
                  }}
                />
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
              <section className="space-y-6">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">Crop tracker</h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        What is planted, where it is, and how much it is really yielding.
                      </p>
                    </div>
                    <span className="text-sm text-zinc-500">{crops.length} crops</span>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
                    <div className="grid grid-cols-5 gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      <div>Crop</div>
                      <div>Zone</div>
                      <div>Status</div>
                      <div>Harvest</div>
                      <div>Actual yield</div>
                    </div>

                    {crops.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-zinc-500">No crops yet.</div>
                    ) : (
                      crops.map((crop) => (
                        <div
                          key={crop.id}
                          className="grid grid-cols-5 gap-4 border-b border-zinc-100 px-4 py-4 text-sm last:border-b-0"
                        >
                          <div>
                            <div className="font-semibold">{crop.crop_name}</div>
                            <div className="text-zinc-500">{crop.variety || "—"}</div>
                          </div>
                          <div>{crop.zone?.[0]?.name ?? "No zone"}</div>
                          <div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(crop.status)}`}
                            >
                              {crop.status}
                            </span>
                          </div>
                          <div>{formatDate(crop.expected_harvest_start)}</div>
                          <div>{crop.actual_yield_kg ?? 0} kg</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">Assets</h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        Equipment, vehicles, tools, and infrastructure.
                      </p>
                    </div>
                    <span className="text-sm text-zinc-500">{assets.length} logged</span>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
                    <div className="grid grid-cols-5 gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      <div>Name</div>
                      <div>Category</div>
                      <div>Paid by</div>
                      <div>Price</div>
                      <div>Condition</div>
                    </div>

                    {assets.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-zinc-500">No assets logged yet.</div>
                    ) : (
                      assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="grid grid-cols-5 gap-4 border-b border-zinc-100 px-4 py-4 text-sm last:border-b-0"
                        >
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            {asset.notes ? (
                              <div className="text-zinc-500">{asset.notes}</div>
                            ) : null}
                          </div>
                          <div className="capitalize">{asset.category}</div>
                          <div>{asset.paid_by ?? "—"}</div>
                          <div>{asset.purchase_price ? formatMoney(asset.purchase_price) : "—"}</div>
                          <div className="capitalize">{asset.condition ?? "—"}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">Pest log</h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        Issues spotted and actions taken.
                      </p>
                    </div>
                    <span className="text-sm text-zinc-500">{pests.length} logged</span>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
                    <div className="grid grid-cols-4 gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      <div>Date</div>
                      <div>Pest</div>
                      <div>Crop / zone</div>
                      <div>Action taken</div>
                    </div>

                    {pests.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-zinc-500">No pest issues logged yet.</div>
                    ) : (
                      pests.map((pest) => (
                        <div
                          key={pest.id}
                          className="grid grid-cols-4 gap-4 border-b border-zinc-100 px-4 py-4 text-sm last:border-b-0"
                        >
                          <div>{formatDate(pest.logged_date)}</div>
                          <div>
                            <div className="font-medium">{pest.pest_name}</div>
                            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                              pest.severity === "high"
                                ? "bg-rose-100 text-rose-700"
                                : pest.severity === "medium"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {pest.severity}
                            </span>
                          </div>
                          <div>
                            <div>{pest.crop?.[0]?.crop_name ?? "—"}</div>
                            {pest.zone?.[0]?.name ? (
                              <div className="text-zinc-500">{pest.zone[0].name}</div>
                            ) : null}
                          </div>
                          <div className="text-zinc-600">{pest.action_taken ?? "—"}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <ActivityFeed activities={activities} />

                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">Next best move</h2>
                  <div className="mt-4 space-y-3 text-sm text-zinc-600">
                    <p>Add sales logging</p>
                    <p>Add worker task view</p>
                  </div>
                </div>
              </aside>
            </div>

            <section className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Expected income
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{formatMoney(forecastRevenue)}</p>
                  <p className="mt-1 text-xs text-zinc-400">Based on estimated yield × price per kg</p>
                </div>
                <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Total expenses
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{formatMoney(totalExpenses)}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Net: {formatMoney(forecastRevenue - totalExpenses)}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Expenses</h2>
                    <p className="mt-1 text-sm text-zinc-500">Most recent 20 expenses.</p>
                  </div>
                  <span className="text-sm text-zinc-500">{expenses.length} logged</span>
                </div>

                <div className="mt-5 space-y-2">
                  {expenses.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 px-4 py-6 text-sm text-zinc-500">No expenses yet.</div>
                  ) : (
                    expenses.map((expense) => (
                      <div key={expense.id} className="rounded-2xl border border-zinc-200 bg-white">
                        {editingExpenseId === expense.id && editingExpenseForm ? (
                          <div className="p-4">
                            <ExpenseForm
                              zones={zones}
                              crops={crops}
                              defaultZoneId={defaultZoneId}
                              initial={editingExpenseForm}
                              submitLabel="Save changes"
                              onSubmit={async (data) => handleUpdateExpense(expense.id, data)}
                            />
                            <button
                              onClick={() => { setEditingExpenseId(null); setEditingExpenseForm(null); }}
                              className="mt-2 text-sm text-zinc-500 hover:text-zinc-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3 px-4 py-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-700">{expense.category}</span>
                                <span className="text-xs text-zinc-400">{formatDate(expense.expense_date)}</span>
                                {expense.vendor_name && <span className="text-xs text-zinc-400">· {expense.vendor_name}</span>}
                              </div>
                              {expense.notes && <p className="mt-1 text-sm text-zinc-700">{expense.notes}</p>}
                              <p className="mt-1 text-sm font-semibold">{expense.amount != null ? formatMoney(expense.amount) : <span className="text-zinc-400 font-normal">Amount TBC</span>}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {confirmDeleteExpenseId === expense.id ? (
                                <>
                                  <span className="text-xs text-red-600">Sure?</span>
                                  <button
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    disabled={deletingExpenseId === expense.id}
                                    className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                  >
                                    {deletingExpenseId === expense.id ? "Deleting…" : "Yes, delete"}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteExpenseId(null)}
                                    className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingExpenseId(expense.id);
                                      setEditingExpenseForm({
                                        category: expense.category,
                                        amount: expense.amount != null ? String(expense.amount) : "",
                                        expense_date: expense.expense_date,
                                        notes: expense.notes ?? "",
                                        vendor_name: expense.vendor_name ?? "",
                                        crop_id: expense.crop_id ?? "",
                                        zone_id: expense.zone_id ?? "",
                                      });
                                    }}
                                    className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteExpenseId(expense.id)}
                                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
