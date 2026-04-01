"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Farm = {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  size_acres: number | null;
};

type Zone = {
  id: string;
  farm_id: string;
  name: string;
  code: string | null;
  size_acres: number | null;
};

type Crop = {
  id: string;
  crop_name: string;
  variety: string | null;
  status: string | null;
  planted_on: string | null;
  expected_harvest_start: string | null;
  expected_harvest_end: string | null;
  estimated_yield_kg: number | null;
  actual_yield_kg: number | null;
  expected_sale_price_per_kg: number | null;
  zone_id?: string | null;
  zone?: { name: string }[] | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  due_time: string | null;
  proof_required: boolean | null;
  zone_id?: string | null;
  crop_id?: string | null;
  crop?: { crop_name: string }[] | null;
  zone?: { name: string }[] | null;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  meta: string | null;
  created_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number) {
  return `TZS ${value.toLocaleString()}`;
}

function badgeClass(status?: string | null) {
  switch (status) {
    case "done":
    case "harvested":
      return "bg-emerald-100 text-emerald-700";
    case "in_progress":
    case "growing":
    case "germinating":
      return "bg-blue-100 text-blue-700";
    case "harvest_ready":
      return "bg-amber-100 text-amber-700";
    case "failed":
    case "cancelled":
      return "bg-rose-100 text-rose-700";
    case "planned":
    case "planted":
    case "todo":
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export default function FarmPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [activeFarmId, setActiveFarmId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [savingCrop, setSavingCrop] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [error, setError] = useState<string>("");

  const [cropForm, setCropForm] = useState({
    crop_name: "",
    variety: "",
    zone_id: "",
    status: "planned",
    planted_on: "",
    expected_harvest_start: "",
    estimated_yield_kg: "",
    expected_sale_price_per_kg: "",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    zone_id: "",
    crop_id: "",
    status: "todo",
    priority: "medium",
    due_date: "",
    proof_required: false,
  });

  async function loadFarms() {
    const { data, error } = await supabase
      .from("farms")
      .select("id, name, slug, location, size_acres")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    const farmRows = (data ?? []) as Farm[];
    setFarms(farmRows);

    if (!activeFarmId && farmRows.length > 0) {
      setActiveFarmId(farmRows[0].id);
    }
  }

  async function loadFarmData(farmId: string) {
    const [zonesRes, cropsRes, tasksRes, activitiesRes] = await Promise.all([
      supabase
        .from("zones")
        .select("id, farm_id, name, code, size_acres")
        .eq("farm_id", farmId)
        .eq("is_active", true)
        .order("name"),

      supabase
        .from("crops")
        .select(`
          id,
          crop_name,
          variety,
          status,
          planted_on,
          expected_harvest_start,
          expected_harvest_end,
          estimated_yield_kg,
          actual_yield_kg,
          expected_sale_price_per_kg,
          zone_id,
          zone:zones(name)
        `)
        .eq("farm_id", farmId)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),

      supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          due_time,
          proof_required,
          zone_id,
          crop_id,
          crop:crops(crop_name),
          zone:zones(name)
        `)
        .eq("farm_id", farmId)
        .order("due_date", { ascending: true }),

      supabase
        .from("activities")
        .select("id, type, title, meta, created_at")
        .eq("farm_id", farmId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (zonesRes.error) throw zonesRes.error;
    if (cropsRes.error) throw cropsRes.error;
    if (tasksRes.error) throw tasksRes.error;
    if (activitiesRes.error) throw activitiesRes.error;

    setZones((zonesRes.data ?? []) as Zone[]);
    setCrops((cropsRes.data ?? []) as Crop[]);
    setTasks((tasksRes.data ?? []) as Task[]);
    setActivities((activitiesRes.data ?? []) as Activity[]);

    setCropForm((prev) => ({
      ...prev,
      zone_id: "",
    }));

    setTaskForm((prev) => ({
      ...prev,
      zone_id: "",
      crop_id: "",
    }));
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
    (task) => task.due_date === today && task.status !== "done"
  );

  const openTasks = tasks.filter(
    (task) => task.status === "todo" || task.status === "in_progress"
  );

  const readyToHarvest = crops.filter((crop) => crop.status === "harvest_ready");

  const forecastRevenue = crops.reduce((sum, crop) => {
    const estimatedYieldKg = Number(crop.estimated_yield_kg ?? 0);
    const expectedPricePerKg = Number(crop.expected_sale_price_per_kg ?? 0);
    return sum + estimatedYieldKg * expectedPricePerKg;
  }, 0);

  async function handleCreateCrop(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarmId) return;

    try {
      setSavingCrop(true);
      setError("");

      const { error: insertError } = await supabase.from("crops").insert({
        farm_id: activeFarmId,
        zone_id: cropForm.zone_id || null,
        crop_name: cropForm.crop_name.trim(),
        variety: cropForm.variety.trim() || null,
        status: cropForm.status,
        planted_on: cropForm.planted_on || null,
        expected_harvest_start: cropForm.expected_harvest_start || null,
        estimated_yield_kg: cropForm.estimated_yield_kg
          ? Number(cropForm.estimated_yield_kg)
          : null,
        expected_sale_price_per_kg: cropForm.expected_sale_price_per_kg
          ? Number(cropForm.expected_sale_price_per_kg)
          : null,
        is_active: true,
      });

      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "crop_created",
        title: `${cropForm.crop_name.trim()} added`,
        meta: cropForm.zone_id
          ? `Zone linked`
          : "Crop created",
      });

      setCropForm({
        crop_name: "",
        variety: "",
        zone_id: "",
        status: "planned",
        planted_on: "",
        expected_harvest_start: "",
        estimated_yield_kg: "",
        expected_sale_price_per_kg: "",
      });

      await loadFarmData(activeFarmId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create crop");
    } finally {
      setSavingCrop(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarmId) return;

    try {
      setSavingTask(true);
      setError("");

      const { error: insertError } = await supabase.from("tasks").insert({
        farm_id: activeFarmId,
        zone_id: taskForm.zone_id || null,
        crop_id: taskForm.crop_id || null,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        status: taskForm.status,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        proof_required: taskForm.proof_required,
      });

      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "task_created",
        title: `${taskForm.title.trim()} created`,
        meta: taskForm.due_date ? `Due ${taskForm.due_date}` : "Task added",
      });

      setTaskForm({
        title: "",
        description: "",
        zone_id: "",
        crop_id: "",
        status: "todo",
        priority: "medium",
        due_date: "",
        proof_required: false,
      });

      await loadFarmData(activeFarmId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSavingTask(false);
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
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {activeFarm?.name ?? "Farm Manager"}
              </h1>
              <p className="mt-3 text-sm text-zinc-600 sm:text-base">
                {activeFarm?.location || "No location set"}
                {activeFarm?.size_acres ? ` · ${activeFarm.size_acres} acres` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
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
            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                <p className="mt-3 text-3xl font-semibold">
                  {formatMoney(forecastRevenue)}
                </p>
              </div>
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold">Create crop</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Keep this simple. Add the crop cycle and link it to a zone.
                  </p>
                </div>

                <form onSubmit={handleCreateCrop} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Crop name</label>
                      <input
                        type="text"
                        value={cropForm.crop_name}
                        onChange={(e) =>
                          setCropForm((prev) => ({ ...prev, crop_name: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                        placeholder="Tomatoes"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Variety</label>
                      <input
                        type="text"
                        value={cropForm.variety}
                        onChange={(e) =>
                          setCropForm((prev) => ({ ...prev, variety: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                        placeholder="Roma"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Zone</label>
                      <select
                        value={cropForm.zone_id}
                        onChange={(e) =>
                          setCropForm((prev) => ({ ...prev, zone_id: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      >
                        <option value="">No zone</option>
                        {zones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Status</label>
                      <select
                        value={cropForm.status}
                        onChange={(e) =>
                          setCropForm((prev) => ({ ...prev, status: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      >
                        <option value="planned">planned</option>
                        <option value="planted">planted</option>
                        <option value="germinating">germinating</option>
                        <option value="growing">growing</option>
                        <option value="harvest_ready">harvest_ready</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Planted on</label>
                      <input
                        type="date"
                        value={cropForm.planted_on}
                        onChange={(e) =>
                          setCropForm((prev) => ({ ...prev, planted_on: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Expected harvest
                      </label>
                      <input
                        type="date"
                        value={cropForm.expected_harvest_start}
                        onChange={(e) =>
                          setCropForm((prev) => ({
                            ...prev,
                            expected_harvest_start: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Estimated yield (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={cropForm.estimated_yield_kg}
                        onChange={(e) =>
                          setCropForm((prev) => ({
                            ...prev,
                            estimated_yield_kg: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                        placeholder="900"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Expected price per kg
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={cropForm.expected_sale_price_per_kg}
                        onChange={(e) =>
                          setCropForm((prev) => ({
                            ...prev,
                            expected_sale_price_per_kg: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                        placeholder="3000"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingCrop || !cropForm.crop_name.trim()}
                    className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingCrop ? "Creating crop..." : "Create crop"}
                  </button>
                </form>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold">Create task</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Add what needs doing and link it to a crop if relevant.
                  </p>
                </div>

                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Task title</label>
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={(e) =>
                        setTaskForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      placeholder="Stake tomato rows"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Description</label>
                    <textarea
                      value={taskForm.description}
                      onChange={(e) =>
                        setTaskForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="min-h-[110px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      placeholder="Support tomatoes before the next growth push."
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Zone</label>
                      <select
                        value={taskForm.zone_id}
                        onChange={(e) =>
                          setTaskForm((prev) => ({ ...prev, zone_id: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      >
                        <option value="">No zone</option>
                        {zones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Crop</label>
                      <select
                        value={taskForm.crop_id}
                        onChange={(e) =>
                          setTaskForm((prev) => ({ ...prev, crop_id: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      >
                        <option value="">General task</option>
                        {crops.map((crop) => (
                          <option key={crop.id} value={crop.id}>
                            {crop.crop_name}
                            {crop.variety ? ` · ${crop.variety}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Status</label>
                      <select
                        value={taskForm.status}
                        onChange={(e) =>
                          setTaskForm((prev) => ({ ...prev, status: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      >
                        <option value="todo">todo</option>
                        <option value="in_progress">in_progress</option>
                        <option value="done">done</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Priority</label>
                      <select
                        value={taskForm.priority}
                        onChange={(e) =>
                          setTaskForm((prev) => ({ ...prev, priority: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                        <option value="urgent">urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Due date</label>
                      <input
                        type="date"
                        value={taskForm.due_date}
                        onChange={(e) =>
                          setTaskForm((prev) => ({ ...prev, due_date: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-3 rounded-2xl border border-zinc-300 px-4 py-3 text-sm">
                        <input
                          type="checkbox"
                          checked={taskForm.proof_required}
                          onChange={(e) =>
                            setTaskForm((prev) => ({
                              ...prev,
                              proof_required: e.target.checked,
                            }))
                          }
                        />
                        Photo proof required
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingTask || !taskForm.title.trim()}
                    className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingTask ? "Creating task..." : "Create task"}
                  </button>
                </form>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
              <section className="space-y-6">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">Today’s tasks</h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        Keep this tight. This is what matters in the field.
                      </p>
                    </div>
                    <span className="text-sm text-zinc-500">{tasksToday.length} due</span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {tasksToday.length === 0 ? (
                      <p className="text-sm text-zinc-500">No tasks due today.</p>
                    ) : (
                      tasksToday.map((task) => (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-zinc-200 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(
                                task.status
                              )}`}
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
                            <p className="mt-2 text-sm text-zinc-500">
                              {task.description}
                            </p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">Crop tracker</h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        What is planted, where it is, and when it should come out.
                      </p>
                    </div>
                    <span className="text-sm text-zinc-500">{crops.length} crops</span>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
                    <div className="grid grid-cols-4 gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      <div>Crop</div>
                      <div>Zone</div>
                      <div>Status</div>
                      <div>Harvest</div>
                    </div>

                    {crops.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-zinc-500">
                        No crops yet.
                      </div>
                    ) : (
                      crops.map((crop) => (
                        <div
                          key={crop.id}
                          className="grid grid-cols-4 gap-4 border-b border-zinc-100 px-4 py-4 text-sm last:border-b-0"
                        >
                          <div>
                            <div className="font-semibold">{crop.crop_name}</div>
                            <div className="text-zinc-500">{crop.variety || "—"}</div>
                          </div>

                          <div>{crop.zone?.[0]?.name ?? "No zone"}</div>

                          <div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(
                                crop.status
                              )}`}
                            >
                              {crop.status}
                            </span>
                          </div>

                          <div>{formatDate(crop.expected_harvest_start)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">Recent activity</h2>

                  <div className="mt-5 space-y-4">
                    {activities.length === 0 ? (
                      <p className="text-sm text-zinc-500">No activity yet.</p>
                    ) : (
                      activities.map((item) => (
                        <div
                          key={item.id}
                          className="border-b border-zinc-100 pb-4 last:border-b-0 last:pb-0"
                        >
                          <p className="font-medium">{item.title}</p>
                          {item.meta ? (
                            <p className="mt-1 text-sm text-zinc-500">{item.meta}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-zinc-400">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">Next best move</h2>
                  <div className="mt-4 space-y-3 text-sm text-zinc-600">
                    <p>Add task completion</p>
                    <p>Add harvest logging</p>
                    <p>Add expense logging</p>
                    <p>Then add auth and worker-specific screens</p>
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
