"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CloudOff,
  Droplets,
  Leaf,
  MapPin,
  Package,
  Sprout,
  Sun,
  Tractor,
  Wallet,
} from "lucide-react";

type Farm = {
  id: string;
  name: string;
  manager: string;
  location: string;
  size: string;
  activeCrops: number;
  workersToday: number;
};

type CropStatus = "planned" | "planted" | "growing" | "harvest-ready" | "harvested";
type TaskStatus = "todo" | "in-progress" | "done";
type TaskPriority = "low" | "medium" | "high";

type Crop = {
  id: string;
  farmId: string;
  name: string;
  variety: string;
  zone: string;
  plantedOn: string;
  expectedHarvest: string;
  status: CropStatus;
  plantedArea: string;
  estimatedYieldKg: number;
  actualYieldKg?: number;
  forecastValueTzs: number;
  costToDateTzs: number;
  health: "excellent" | "good" | "watch";
  nextAction: string;
};

type Task = {
  id: string;
  farmId: string;
  cropId?: string;
  title: string;
  zone: string;
  assignedTo: string;
  due: string;
  status: TaskStatus;
  priority: TaskPriority;
  proofRequired?: boolean;
};

type ActivityItem = {
  id: string;
  farmId: string;
  type: "task" | "crop" | "harvest" | "note";
  title: string;
  meta: string;
  time: string;
};

const farms: Farm[] = [
  {
    id: "farm-1",
    name: "Inguka North",
    manager: "Juma",
    location: "Inguka, Pemba",
    size: "6.2 acres",
    activeCrops: 7,
    workersToday: 11,
  },
  {
    id: "farm-2",
    name: "Inguka South",
    manager: "Asha",
    location: "Inguka, Pemba",
    size: "4.8 acres",
    activeCrops: 5,
    workersToday: 8,
  },
];

const crops: Crop[] = [
  {
    id: "crop-1",
    farmId: "farm-1",
    name: "Tomatoes",
    variety: "Roma",
    zone: "Zone A1",
    plantedOn: "2026-02-18",
    expectedHarvest: "2026-04-22",
    status: "growing",
    plantedArea: "0.7 acres",
    estimatedYieldKg: 980,
    forecastValueTzs: 2940000,
    costToDateTzs: 780000,
    health: "good",
    nextAction: "Stake and prune this week",
  },
  {
    id: "crop-2",
    farmId: "farm-1",
    name: "Spinach",
    variety: "Local Green",
    zone: "Zone B2",
    plantedOn: "2026-03-10",
    expectedHarvest: "2026-04-08",
    status: "harvest-ready",
    plantedArea: "0.3 acres",
    estimatedYieldKg: 210,
    forecastValueTzs: 630000,
    costToDateTzs: 140000,
    health: "excellent",
    nextAction: "Harvest in the next 48 hours",
  },
  {
    id: "crop-3",
    farmId: "farm-1",
    name: "Maize",
    variety: "Hybrid",
    zone: "Upper Field",
    plantedOn: "2026-01-29",
    expectedHarvest: "2026-05-20",
    status: "growing",
    plantedArea: "1.6 acres",
    estimatedYieldKg: 1650,
    forecastValueTzs: 2475000,
    costToDateTzs: 920000,
    health: "watch",
    nextAction: "Check pest pressure on west edge",
  },
  {
    id: "crop-4",
    farmId: "farm-2",
    name: "Okra",
    variety: "Emerald",
    zone: "East Beds",
    plantedOn: "2026-02-26",
    expectedHarvest: "2026-04-19",
    status: "growing",
    plantedArea: "0.5 acres",
    estimatedYieldKg: 460,
    forecastValueTzs: 1150000,
    costToDateTzs: 320000,
    health: "good",
    nextAction: "Irrigate lightly and weed",
  },
  {
    id: "crop-5",
    farmId: "farm-2",
    name: "Cassava",
    variety: "Mkombozi",
    zone: "South Plot",
    plantedOn: "2026-01-12",
    expectedHarvest: "2026-07-30",
    status: "growing",
    plantedArea: "1.2 acres",
    estimatedYieldKg: 2400,
    forecastValueTzs: 4320000,
    costToDateTzs: 880000,
    health: "good",
    nextAction: "Mulch before dry stretch",
  },
  {
    id: "crop-6",
    farmId: "farm-2",
    name: "Watermelon",
    variety: "Sugar Baby",
    zone: "Near Well",
    plantedOn: "2026-03-01",
    expectedHarvest: "2026-05-09",
    status: "planted",
    plantedArea: "0.4 acres",
    estimatedYieldKg: 720,
    forecastValueTzs: 1800000,
    costToDateTzs: 410000,
    health: "excellent",
    nextAction: "Monitor germination success",
  },
];

const tasks: Task[] = [
  {
    id: "task-1",
    farmId: "farm-1",
    cropId: "crop-2",
    title: "Harvest spinach before midday heat",
    zone: "Zone B2",
    assignedTo: "Saidi",
    due: "Today · 10:30",
    status: "todo",
    priority: "high",
    proofRequired: true,
  },
  {
    id: "task-2",
    farmId: "farm-1",
    cropId: "crop-1",
    title: "Stake tomatoes and remove lower leaves",
    zone: "Zone A1",
    assignedTo: "Juma",
    due: "Today · 14:00",
    status: "in-progress",
    priority: "high",
    proofRequired: true,
  },
  {
    id: "task-3",
    farmId: "farm-1",
    cropId: "crop-3",
    title: "Inspect maize rows for pests",
    zone: "Upper Field",
    assignedTo: "Amina",
    due: "Today · 16:30",
    status: "todo",
    priority: "medium",
  },
  {
    id: "task-4",
    farmId: "farm-2",
    cropId: "crop-4",
    title: "Weed okra beds and log labour time",
    zone: "East Beds",
    assignedTo: "Hassan",
    due: "Today · 11:45",
    status: "todo",
    priority: "medium",
  },
  {
    id: "task-5",
    farmId: "farm-2",
    cropId: "crop-6",
    title: "Check watermelon germination rate",
    zone: "Near Well",
    assignedTo: "Asha",
    due: "Today · 17:00",
    status: "todo",
    priority: "low",
  },
  {
    id: "task-6",
    farmId: "farm-2",
    cropId: "crop-5",
    title: "Apply mulch to cassava rows",
    zone: "South Plot",
    assignedTo: "Bakari",
    due: "Tomorrow · 09:00",
    status: "todo",
    priority: "high",
    proofRequired: true,
  },
];

const activity: ActivityItem[] = [
  {
    id: "a-1",
    farmId: "farm-1",
    type: "harvest",
    title: "Spinach batch marked harvest-ready",
    meta: "Zone B2 · forecast 210 kg",
    time: "24 min ago",
  },
  {
    id: "a-2",
    farmId: "farm-1",
    type: "task",
    title: "Tomato staking started",
    meta: "Juma uploaded 2 field photos",
    time: "1 hr ago",
  },
  {
    id: "a-3",
    farmId: "farm-2",
    type: "crop",
    title: "Watermelon germination updated",
    meta: "Near Well · 87% emergence",
    time: "2 hrs ago",
  },
  {
    id: "a-4",
    farmId: "farm-2",
    type: "note",
    title: "Diesel spend logged",
    meta: "Irrigation pump · 38,000 TZS",
    time: "3 hrs ago",
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatTzs(value: number) {
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusPill(status: CropStatus | TaskStatus | TaskPriority) {
  const map: Record<string, string> = {
    planned: "bg-zinc-100 text-zinc-700",
    planted: "bg-sky-100 text-sky-700",
    growing: "bg-emerald-100 text-emerald-700",
    "harvest-ready": "bg-amber-100 text-amber-700",
    harvested: "bg-zinc-200 text-zinc-800",
    todo: "bg-zinc-100 text-zinc-700",
    "in-progress": "bg-blue-100 text-blue-700",
    done: "bg-emerald-100 text-emerald-700",
    low: "bg-zinc-100 text-zinc-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-rose-100 text-rose-700",
  };

  return cn(
    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
    map[status]
  );
}

export default function FarmTaskManagerPage() {
  const [activeFarmId, setActiveFarmId] = useState<string>(farms[0].id);
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "crops" | "planning">("overview");
  const [showCompleted, setShowCompleted] = useState(false);

  const activeFarm = farms.find((f) => f.id === activeFarmId) || farms[0];
  const farmCrops = useMemo(() => crops.filter((crop) => crop.farmId === activeFarmId), [activeFarmId]);
  const farmTasks = useMemo(() => tasks.filter((task) => task.farmId === activeFarmId), [activeFarmId]);
  const farmActivity = useMemo(() => activity.filter((item) => item.farmId === activeFarmId), [activeFarmId]);

  const tasksDueToday = farmTasks.filter((t) => t.due.startsWith("Today") && (showCompleted || t.status !== "done"));
  const urgentHarvests = farmCrops.filter((c) => c.status === "harvest-ready");
  const forecastRevenue = farmCrops.reduce((sum, crop) => sum + crop.forecastValueTzs, 0);
  const costToDate = farmCrops.reduce((sum, crop) => sum + crop.costToDateTzs, 0);
  const forecastProfit = forecastRevenue - costToDate;
  const totalEstimatedYield = farmCrops.reduce((sum, crop) => sum + crop.estimatedYieldKg, 0);

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="w-full border-b border-zinc-200 bg-white/90 backdrop-blur lg:min-h-screen lg:w-[300px] lg:border-b-0 lg:border-r">
          <div className="border-b border-zinc-200 p-5 lg:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm">
                <Leaf className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Inguka Farms</p>
                <h1 className="text-xl font-semibold tracking-tight">Farm Task Manager</h1>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <CloudOff className="h-4 w-4" />
              Offline mode ready for field sync
            </div>
          </div>

          <div className="p-4 lg:p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Farms</p>
            <div className="space-y-3">
              {farms.map((farm) => {
                const isActive = farm.id === activeFarmId;
                return (
                  <button
                    key={farm.id}
                    onClick={() => setActiveFarmId(farm.id)}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition",
                      isActive
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-lg"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold">{farm.name}</div>
                        <div className={cn("mt-1 text-sm", isActive ? "text-zinc-300" : "text-zinc-500")}>{farm.location}</div>
                      </div>
                      <ChevronRight className={cn("mt-0.5 h-4 w-4", isActive ? "text-zinc-300" : "text-zinc-400")} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className={cn("rounded-xl px-3 py-2", isActive ? "bg-white/10 text-zinc-100" : "bg-zinc-50 text-zinc-700")}>
                        {farm.activeCrops} active crops
                      </div>
                      <div className={cn("rounded-xl px-3 py-2", isActive ? "bg-white/10 text-zinc-100" : "bg-zinc-50 text-zinc-700")}>
                        {farm.workersToday} workers today
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Why this structure works</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                <li>Phone-first for workers in the field</li>
                <li>Desktop overview for planning and profitability</li>
                <li>Multi-farm ready so you can resell later</li>
                <li>Tasks and crops linked properly, not separate tools</li>
              </ul>
            </div>
          </div>
        </aside>

        <section className="flex-1">
          <div className="sticky top-0 z-20 border-b border-zinc-200 bg-[#f5f3ee]/90 backdrop-blur">
            <div className="px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Live farm workspace</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{activeFarm.name}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-600">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {activeFarm.location}</span>
                    <span className="inline-flex items-center gap-1"><Tractor className="h-4 w-4" /> Managed by {activeFarm.manager}</span>
                    <span className="inline-flex items-center gap-1"><Sprout className="h-4 w-4" /> {activeFarm.size}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <button className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Add</div>
                    <div className="mt-1 text-sm font-medium">New Task</div>
                  </button>
                  <button className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Add</div>
                    <div className="mt-1 text-sm font-medium">New Crop</div>
                  </button>
                  <button className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Log</div>
                    <div className="mt-1 text-sm font-medium">Harvest</div>
                  </button>
                  <button className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">View</div>
                    <div className="mt-1 text-sm font-medium">Reports</div>
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  ["overview", "Overview"],
                  ["tasks", "Tasks"],
                  ["crops", "Crops"],
                  ["planning", "Planning"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as typeof activeTab)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition",
                      activeTab === key ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
              <StatCard title="Tasks today" value={String(tasksDueToday.length)} icon={<CalendarDays className="h-5 w-5" />} subtitle="What needs doing now" />
              <StatCard title="Harvest soon" value={String(urgentHarvests.length)} icon={<Package className="h-5 w-5" />} subtitle="Ready or nearly ready" />
              <StatCard title="Estimated yield" value={`${totalEstimatedYield.toLocaleString()} kg`} icon={<BarChart3 className="h-5 w-5" />} subtitle="Current farm forecast" />
              <StatCard title="Forecast revenue" value={formatTzs(forecastRevenue)} icon={<ArrowUpRight className="h-5 w-5" />} subtitle="Projected crop sales" />
              <StatCard title="Forecast profit" value={formatTzs(forecastProfit)} icon={<Wallet className="h-5 w-5" />} subtitle="Revenue minus tracked costs" className="col-span-2 sm:col-span-4 xl:col-span-1" />
            </div>

            {activeTab === "overview" && (
              <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
                <div className="space-y-6">
                  <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">Today’s field execution</h3>
                        <p className="mt-1 text-sm text-zinc-500">This is the worker-first screen. Big tasks. Clear priority. Fast proof capture.</p>
                      </div>
                      <button
                        onClick={() => setShowCompleted((v) => !v)}
                        className="rounded-full border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                      >
                        {showCompleted ? "Hide done" : "Show done"}
                      </button>
                    </div>
                    <div className="mt-5 space-y-3">
                      {tasksDueToday.map((task) => {
                        const linkedCrop = farmCrops.find((crop) => crop.id === task.cropId);
                        return (
                          <div key={task.id} className="rounded-2xl border border-zinc-200 p-4 transition hover:border-zinc-300">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={statusPill(task.priority)}>{task.priority}</span>
                                  <span className={statusPill(task.status)}>{task.status}</span>
                                  {task.proofRequired ? (
                                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
                                      Photo proof
                                    </span>
                                  ) : null}
                                </div>
                                <h4 className="mt-3 text-base font-semibold">{task.title}</h4>
                                <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-500">
                                  <span>{task.zone}</span>
                                  <span>{task.assignedTo}</span>
                                  <span>{task.due}</span>
                                  {linkedCrop ? <span>{linkedCrop.name}</span> : null}
                                </div>
                              </div>
                              <button className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
                                Open task
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Crop watchlist</h3>
                        <p className="mt-1 text-sm text-zinc-500">Crops, timing, health, yield, and next action all in one place.</p>
                      </div>
                      <button className="rounded-full border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">See all crops</button>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {farmCrops.slice(0, 4).map((crop) => {
                        const margin = crop.forecastValueTzs - crop.costToDateTzs;
                        return (
                          <div key={crop.id} className="rounded-2xl border border-zinc-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-base font-semibold">{crop.name}</h4>
                                  <span className={statusPill(crop.status)}>{crop.status.replace("-", " ")}</span>
                                </div>
                                <p className="mt-1 text-sm text-zinc-500">{crop.variety} · {crop.zone}</p>
                              </div>
                              <HealthDot health={crop.health} />
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                              <Metric label="Planted" value={crop.plantedOn} />
                              <Metric label="Harvest" value={crop.expectedHarvest} />
                              <Metric label="Yield" value={`${crop.estimatedYieldKg} kg`} />
                              <Metric label="Margin" value={formatTzs(margin)} />
                            </div>
                            <div className="mt-4 rounded-2xl bg-[#f5f3ee] px-3 py-3 text-sm text-zinc-700">
                              <span className="font-medium">Next action:</span> {crop.nextAction}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="text-lg font-semibold">Live activity</h3>
                    <p className="mt-1 text-sm text-zinc-500">This stops the system feeling dead. You want visible movement on the farm.</p>
                    <div className="mt-5 space-y-4">
                      {farmActivity.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-100">
                            {item.type === "task" && <CheckCircle2 className="h-4 w-4" />}
                            {item.type === "crop" && <Sprout className="h-4 w-4" />}
                            {item.type === "harvest" && <Package className="h-4 w-4" />}
                            {item.type === "note" && <Activity className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                            <p className="mt-1 text-sm text-zinc-500">{item.meta}</p>
                            <p className="mt-1 text-xs text-zinc-400">{item.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="text-lg font-semibold">Farm conditions</h3>
                    <div className="mt-4 space-y-3">
                      <ConditionRow icon={<Sun className="h-4 w-4" />} label="Dry-season watch" value="Plan irrigation before yield drops" />
                      <ConditionRow icon={<Droplets className="h-4 w-4" />} label="Water access" value="Well pressure stable today" />
                      <ConditionRow icon={<AlertCircle className="h-4 w-4" />} label="Risk" value="Maize pest check flagged" />
                    </div>
                  </section>

                  <section className="rounded-3xl border border-zinc-200 bg-zinc-900 p-5 text-white shadow-sm sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Resell-ready architecture</p>
                    <h3 className="mt-2 text-lg font-semibold">Built for two farms now, many farms later</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      Every task, crop, harvest, and cost should belong to a farm first. That is what makes this a real product later instead of a one-off internal tool.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Task board</h3>
                    <p className="mt-1 text-sm text-zinc-500">Phone-first, large tap targets, clear ownership, and proof where needed.</p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button className="rounded-full bg-zinc-900 px-4 py-2 text-white">Today</button>
                    <button className="rounded-full bg-zinc-100 px-4 py-2 text-zinc-700">This week</button>
                    <button className="rounded-full bg-zinc-100 px-4 py-2 text-zinc-700">Overdue</button>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 xl:grid-cols-3">
                  {[
                    ["todo", "To do"],
                    ["in-progress", "In progress"],
                    ["done", "Done"],
                  ].map(([status, label]) => (
                    <div key={status} className="rounded-2xl bg-[#f5f3ee] p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="font-semibold">{label}</h4>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">
                          {farmTasks.filter((task) => task.status === status).length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {farmTasks
                          .filter((task) => task.status === status)
                          .map((task) => (
                            <div key={task.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                              <div className="flex items-center justify-between gap-3">
                                <span className={statusPill(task.priority)}>{task.priority}</span>
                                <span className="text-xs text-zinc-400">{task.due}</span>
                              </div>
                              <h5 className="mt-3 text-sm font-semibold text-zinc-900">{task.title}</h5>
                              <div className="mt-2 text-sm text-zinc-500">{task.assignedTo} · {task.zone}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "crops" && (
              <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Crop tracker</h3>
                    <p className="mt-1 text-sm text-zinc-500">Planting dates, harvest windows, yield, crop health, and next action.</p>
                  </div>
                  <button className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white">Add crop cycle</button>
                </div>
                <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200">
                  <div className="grid grid-cols-6 gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    <div>Crop</div>
                    <div>Zone</div>
                    <div>Status</div>
                    <div>Harvest</div>
                    <div>Yield</div>
                    <div>Profitability</div>
                  </div>
                  <div>
                    {farmCrops.map((crop) => (
                      <div key={crop.id} className="grid grid-cols-6 gap-4 border-b border-zinc-100 px-4 py-4 text-sm last:border-b-0">
                        <div>
                          <div className="font-semibold">{crop.name}</div>
                          <div className="text-zinc-500">{crop.variety}</div>
                        </div>
                        <div>{crop.zone}</div>
                        <div><span className={statusPill(crop.status)}>{crop.status.replace("-", " ")}</span></div>
                        <div>{crop.expectedHarvest}</div>
                        <div>{crop.estimatedYieldKg} kg</div>
                        <div className="font-medium">{formatTzs(crop.forecastValueTzs - crop.costToDateTzs)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "planning" && (
              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="text-lg font-semibold">Seasonal planning</h3>
                  <p className="mt-1 text-sm text-zinc-500">This is where the product moves from farm logbook to real management system.</p>
                  <div className="mt-5 space-y-4">
                    <PlanningCard
                      title="Next 14 days"
                      body="2 harvest windows, 5 irrigation-critical tasks, and 1 pest watch issue need action."
                    />
                    <PlanningCard
                      title="Yield outlook"
                      body={`Current farm forecast is ${totalEstimatedYield.toLocaleString()} kg with ${formatTzs(forecastRevenue)} projected revenue.`}
                    />
                    <PlanningCard
                      title="Profitability signal"
                      body={`Tracked costs are ${formatTzs(costToDate)}. Forecast margin currently sits at ${formatTzs(forecastProfit)}.`}
                    />
                  </div>
                </section>

                <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="text-lg font-semibold">What to build next</h3>
                  <div className="mt-5 space-y-4 text-sm text-zinc-600">
                    <RoadmapRow step="1" title="Offline sync for workers" body="Store task updates locally and sync images + status when connection returns." />
                    <RoadmapRow step="2" title="Real forecasting engine" body="Use planting dates, crop cycles, rainfall, labour cost, and market price assumptions." />
                    <RoadmapRow step="3" title="Multi-farm admin" body="Separate owner dashboard from farm-worker view so this can become a SaaS product later." />
                  </div>
                </section>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  className,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{title}</p>
          <div className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{value}</div>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">{icon}</div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{label}</div>
      <div className="mt-1 font-medium text-zinc-800">{value}</div>
    </div>
  );
}

function HealthDot({ health }: { health: Crop["health"] }) {
  const styles: Record<Crop["health"], string> = {
    excellent: "bg-emerald-500",
    good: "bg-sky-500",
    watch: "bg-amber-500",
  };
  return (
    <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700">
      <span className={cn("h-2.5 w-2.5 rounded-full", styles[health])} />
      {health}
    </div>
  );
}

function ConditionRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[#f5f3ee] p-3">
      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-zinc-700">{icon}</div>
      <div>
        <div className="text-sm font-medium text-zinc-900">{label}</div>
        <div className="mt-1 text-sm text-zinc-500">{value}</div>
      </div>
    </div>
  );
}

function PlanningCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-4">
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-zinc-600">{body}</div>
    </div>
  );
}

function RoadmapRow({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-zinc-200 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-semibold text-white">
        {step}
      </div>
      <div>
        <div className="font-semibold text-zinc-900">{title}</div>
        <div className="mt-1 leading-6 text-zinc-600">{body}</div>
      </div>
    </div>
  );
}
