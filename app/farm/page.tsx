import Link from "next/link";
import {
  getActivities,
  getCrops,
  getFarmBySlug,
  getFarms,
  getTasks,
} from "@/lib/farm";

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

type SearchParams = Promise<{ farm?: string }>;

export default async function FarmPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = await searchParams;
  const farms = await getFarms();

  if (!farms.length) {
    return (
      <main className="min-h-screen bg-stone-50 text-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Farm Manager
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              No farms yet
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-600">
              Your app is connected, but there is no farm data yet. Add your first
              farms in Supabase, then reload this page.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const activeSlug = params?.farm ?? farms[0].slug;
  const farm = await getFarmBySlug(activeSlug);

  if (!farm) {
    return (
      <main className="min-h-screen bg-stone-50 text-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Farm Manager
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Farm not found
            </h1>
          </div>
        </div>
      </main>
    );
  }

  const [crops, tasks, activities] = await Promise.all([
    getCrops(farm.id),
    getTasks(farm.id),
    getActivities(farm.id),
  ]);

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
                {farm.name}
              </h1>
              <p className="mt-3 text-sm text-zinc-600 sm:text-base">
                {farm.location || "No location set"}
                {farm.size_acres ? ` · ${farm.size_acres} acres` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {farms.map((item) => {
                const isActive = item.slug === farm.slug;

                return (
                  <Link
                    key={item.id}
                    href={`/farm?farm=${item.slug}`}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

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
                        {task.zone?.name ?? "No zone"}
                        <span className="mx-2">·</span>
                        {task.crop?.crop_name ?? "General task"}
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

                      <div>{crop.zone?.name ?? "No zone"}</div>

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
              <h2 className="text-xl font-semibold">What this needs next</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-600">
                <p>Create task</p>
                <p>Create crop</p>
                <p>Log harvest</p>
                <p>Then add auth and worker-specific screens</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
