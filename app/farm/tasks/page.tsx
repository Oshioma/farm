"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getFarms, getZones, getCrops, getTasks, getMembers } from "@/lib/farm";
import type { Farm, Zone, Crop, Task, FarmMember } from "@/lib/farm";
import { formatDate, badgeClass } from "@/app/farm/utils";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

export default function WorkerTasksPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<FarmMember[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "today" | "overdue">("all");
  const [groupBy, setGroupBy] = useState<"none" | "assignee">("assignee");

  useEffect(() => {
    (async () => {
      try {
        const farmRows = await getFarms();
        setFarms(farmRows);
        if (farmRows.length > 0) setActiveFarmId(farmRows[0].id);
      } catch (err) {
        setError(errMsg(err, "Failed to load farms"));
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
        const [zoneRows, cropRows, taskRows, memberRows] = await Promise.all([
          getZones(activeFarmId),
          getCrops(activeFarmId),
          getTasks(activeFarmId),
          getMembers(activeFarmId),
        ]);
        setZones(zoneRows);
        setCrops(cropRows);
        setTasks(taskRows);
        setMembers(memberRows);
      } catch (err) {
        setError(errMsg(err, "Failed to load tasks"));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeFarmId]);

  const activeFarm = useMemo(
    () => farms.find((f) => f.id === activeFarmId) ?? null,
    [farms, activeFarmId]
  );

  const today = new Date().toISOString().slice(0, 10);

  const openTasks = useMemo(() => {
    const open = tasks.filter(
      (t) => t.status === "todo" || t.status === "in_progress"
    );
    if (filter === "today") return open.filter((t) => t.due_date === today);
    if (filter === "overdue") return open.filter((t) => t.due_date && t.due_date < today);
    return open;
  }, [tasks, filter, today]);

  const groupedOpenTasks = useMemo(() => {
    if (groupBy === "none") return [{ label: "", key: "__all__", tasks: openTasks }];
    const groups: { label: string; key: string; tasks: Task[] }[] = [];
    const unassigned: Task[] = [];
    const byAssignee: Record<string, Task[]> = {};

    for (const task of openTasks) {
      if (task.assigned_to) {
        if (!byAssignee[task.assigned_to]) byAssignee[task.assigned_to] = [];
        byAssignee[task.assigned_to].push(task);
      } else {
        unassigned.push(task);
      }
    }

    if (unassigned.length > 0) {
      groups.push({ label: "General (unassigned)", key: "__unassigned__", tasks: unassigned });
    }
    for (const [assignee, assigneeTasks] of Object.entries(byAssignee).sort(([a], [b]) => a.localeCompare(b))) {
      groups.push({ label: assignee, key: assignee, tasks: assigneeTasks });
    }
    return groups;
  }, [openTasks, groupBy]);

  const completedTasks = tasks.filter(
    (t) => t.status === "done" || t.status === "cancelled"
  );

  async function handleComplete(task: Task) {
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

      const taskRows = await getTasks(activeFarmId);
      setTasks(taskRows);
    } catch (err) {
      setError(errMsg(err, "Failed to complete task"));
    } finally {
      setCompletingTaskId(null);
    }
  }

  async function handleStartTask(task: Task) {
    if (!activeFarmId) return;
    try {
      setError("");
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "in_progress" })
        .eq("id", task.id);
      if (updateError) throw updateError;
      const taskRows = await getTasks(activeFarmId);
      setTasks(taskRows);
    } catch (err) {
      setError(errMsg(err, "Failed to start task"));
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Worker Task View
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {activeFarm?.name ?? "Tasks"}
              </h1>
            </div>
            <Link
              href="/farm"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Back to dashboard
            </Link>
          </div>

          {farms.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {farms.map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => setActiveFarmId(farm.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    farm.id === activeFarmId
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {farm.name}
                </button>
              ))}
            </div>
          )}
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading && !activeFarm ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">Loading...</div>
        ) : null}

        {activeFarm && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(
                [
                  { key: "all", label: `All open (${tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length})` },
                  { key: "today", label: `Due today (${tasks.filter((t) => t.due_date === today && t.status !== "done" && t.status !== "cancelled").length})` },
                  { key: "overdue", label: `Overdue (${tasks.filter((t) => t.due_date && t.due_date < today && t.status !== "done" && t.status !== "cancelled").length})` },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === key
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="mx-1 text-zinc-300">|</span>
              <button
                onClick={() => setGroupBy(groupBy === "assignee" ? "none" : "assignee")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  groupBy === "assignee"
                    ? "bg-indigo-600 text-white"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                Group by person
              </button>
            </div>

            <div className="space-y-6">
              {openTasks.length === 0 ? (
                <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
                  No tasks match this filter.
                </div>
              ) : (
                groupedOpenTasks.map((group) => (
                  <div key={group.key}>
                    {group.label && (
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                        {group.label}
                        <span className="ml-2 text-xs font-normal">({group.tasks.length})</span>
                      </h3>
                    )}
                    <div className="space-y-3">
                {group.tasks.map((task) => {
                  const isCompleting = completingTaskId === task.id;
                  const isToday = task.due_date === today;
                  const isOverdue = task.due_date ? task.due_date < today : false;
                  return (
                    <div
                      key={task.id}
                      className={`rounded-2xl border bg-white p-4 shadow-sm ${
                        isOverdue
                          ? "border-rose-200"
                          : isToday
                          ? "border-amber-200"
                          : "border-zinc-200"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(task.status)}`}>
                          {task.status}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                          {task.priority}
                        </span>
                        {isToday && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            today
                          </span>
                        )}
                        {isOverdue && (
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                            overdue
                          </span>
                        )}
                        {task.proof_required && (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                            photo proof
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-semibold">{task.title}</h3>

                      <div className="mt-2 text-sm text-zinc-600">
                        {task.zone?.[0]?.name ?? "No zone"}
                        <span className="mx-2">·</span>
                        {task.crop?.[0]?.crop_name ?? "General task"}
                        <span className="mx-2">·</span>
                        {formatDate(task.due_date)}
                      </div>

                      {task.assigned_to && groupBy === "none" ? (
                        <p className="mt-1.5 text-xs text-indigo-600 font-medium">{task.assigned_to}</p>
                      ) : null}

                      {task.description && (
                        <p className="mt-2 text-sm text-zinc-500">{task.description}</p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {task.status === "todo" && (
                          <button
                            onClick={() => handleStartTask(task)}
                            className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                          >
                            Start task
                          </button>
                        )}
                        <button
                          onClick={() => handleComplete(task)}
                          disabled={isCompleting}
                          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {isCompleting ? "Completing..." : "Mark done"}
                        </button>
                      </div>
                    </div>
                  );
                })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {completedTasks.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 text-lg font-semibold text-zinc-500">
                  Recently completed ({completedTasks.length})
                </h2>
                <div className="space-y-2">
                  {completedTasks.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-medium text-zinc-500 line-through">
                        {task.title}
                      </h3>
                      <div className="mt-1 text-sm text-zinc-400">
                        {task.zone?.[0]?.name ?? "No zone"}
                        <span className="mx-2">·</span>
                        {task.crop?.[0]?.crop_name ?? "General task"}
                        <span className="mx-2">·</span>
                        {formatDate(task.due_date)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
