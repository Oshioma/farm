"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getFarms,
  getZones,
  getCrops,
  getTasks,
  getActivities,
  getExpenses,
} from "@/lib/farm";
import type { Farm, Zone, Crop, Task, Activity, Expense } from "@/lib/farm";
import { formatDate, formatMoney, badgeClass } from "@/app/farm/utils";
import { CropForm } from "@/app/farm/components/CropForm";
import { TaskForm } from "@/app/farm/components/TaskForm";
import { HarvestForm } from "@/app/farm/components/HarvestForm";
import { ExpenseForm } from "@/app/farm/components/ExpenseForm";
import { ActivityFeed } from "@/app/farm/components/ActivityFeed";
import type { CropFormData } from "@/app/farm/components/CropForm";
import type { TaskFormData } from "@/app/farm/components/TaskForm";
import type { HarvestFormData } from "@/app/farm/components/HarvestForm";
import type { ExpenseFormData } from "@/app/farm/components/ExpenseForm";

export default function FarmPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [activeFarmId, setActiveFarmId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editingFarm, setEditingFarm] = useState(false);
  const [farmEditForm, setFarmEditForm] = useState({ name: "", location: "", size_acres: "" });
  const [savingFarm, setSavingFarm] = useState(false);
  const router = useRouter();
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

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
      setError(err instanceof Error ? err.message : "Failed to save farm");
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
    const [zoneRows, cropRows, taskRows, activityRows, expenseRows] = await Promise.all([
      getZones(farmId),
      getCrops(farmId),
      getTasks(farmId),
      getActivities(farmId),
      getExpenses(farmId),
    ]);

    setZones(zoneRows);
    setCrops(cropRows);
    setTasks(taskRows);
    setActivities(activityRows);
    setExpenses(expenseRows);
  }

  async function refreshAll() {
    try {
      setError("");
      setLoading(true);
      await loadFarms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load farms");
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
        setError(err instanceof Error ? err.message : "Failed to load farm data");
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
      setError(err instanceof Error ? err.message : "Failed to create crop");
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
      setError(err instanceof Error ? err.message : "Failed to create task");
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
      setError(err instanceof Error ? err.message : "Failed to complete task");
    } finally {
      setCompletingTaskId(null);
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
      setError(err instanceof Error ? err.message : "Failed to log harvest");
      return false;
    }
  }

  async function handleLogExpense(data: ExpenseFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.amount || Number(data.amount) <= 0) throw new Error("Amount must be greater than zero.");
      if (!data.expense_date) throw new Error("Expense date is required.");

      const { error: insertError } = await supabase.from("expenses").insert({
        farm_id: activeFarmId,
        zone_id: data.zone_id || null,
        crop_id: data.crop_id || null,
        category: data.category,
        amount: Number(data.amount),
        description: data.description.trim() || null,
        expense_date: data.expense_date,
      });
      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "expense_logged",
        title: `${data.category} expense logged`,
        meta: `${formatMoney(Number(data.amount))}${data.description.trim() ? ` · ${data.description.trim()}` : ""}`,
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log expense");
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
                Inguka Farm Manager
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
            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Forecast revenue
                </p>
                <p className="mt-3 text-3xl font-semibold">{formatMoney(forecastRevenue)}</p>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Total expenses
                </p>
                <p className="mt-3 text-3xl font-semibold">{formatMoney(totalExpenses)}</p>
              </div>
            </section>

            <section className="mb-6 grid gap-6 xl:grid-cols-4">
              <CropForm
                zones={zones}
                defaultZoneId={defaultZoneId}
                onSubmit={handleCreateCrop}
              />
              <TaskForm
                zones={zones}
                crops={crops}
                defaultZoneId={defaultZoneId}
                onSubmit={handleCreateTask}
              />
              <HarvestForm
                zones={zones}
                crops={crops}
                defaultCropId={defaultCropId}
                defaultZoneId={defaultZoneId}
                onSubmit={handleLogHarvest}
              />
              <ExpenseForm
                zones={zones}
                crops={crops}
                defaultZoneId={defaultZoneId}
                onSubmit={handleLogExpense}
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
              <section className="space-y-6">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">Today's tasks</h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        This should feel direct and useful, not like admin clutter.
                      </p>
                    </div>
                    <span className="text-sm text-zinc-500">{tasksToday.length} due</span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {tasksToday.length === 0 ? (
                      <p className="text-sm text-zinc-500">No tasks due today.</p>
                    ) : (
                      tasksToday.map((task) => {
                        const isCompleting = completingTaskId === task.id;
                        return (
                          <div
                            key={task.id}
                            className="rounded-2xl border border-zinc-200 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(task.status)}`}
                              >
                                {task.status}
                              </span>
                              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                                {task.priority}
                              </span>
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

                            <div className="mt-4">
                              <button
                                onClick={() => handleCompleteTask(task)}
                                disabled={isCompleting}
                                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isCompleting ? "Completing..." : "Mark done"}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

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
                      <h2 className="text-xl font-semibold">Expenses</h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        Most recent 20 expenses across all categories.
                      </p>
                    </div>
                    <span className="text-sm text-zinc-500">{expenses.length} logged</span>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
                    <div className="grid grid-cols-4 gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      <div>Date</div>
                      <div>Category</div>
                      <div>Crop</div>
                      <div>Amount</div>
                    </div>

                    {expenses.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-zinc-500">No expenses yet.</div>
                    ) : (
                      expenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="grid grid-cols-4 gap-4 border-b border-zinc-100 px-4 py-4 text-sm last:border-b-0"
                        >
                          <div>{formatDate(expense.expense_date)}</div>
                          <div>
                            <div className="font-medium capitalize">{expense.category}</div>
                            {expense.description ? (
                              <div className="text-zinc-500">{expense.description}</div>
                            ) : null}
                          </div>
                          <div>{expense.crop?.[0]?.crop_name ?? "—"}</div>
                          <div className="font-medium">{formatMoney(expense.amount)}</div>
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
          </>
        ) : null}
      </div>
    </main>
  );
}
