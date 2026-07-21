"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase, getCurrentUser } from "@/lib/supabase";
import {
  getFarms,
  getZones,
  getCrops,
  getTasks,
  getMembers,
} from "@/lib/farm";
import type { Farm, Zone, Crop, Task, FarmMember, GoalTimeframe } from "@/lib/farm";
import { formatDate, badgeClass } from "@/app/farm/utils";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useFarmRole } from "@/hooks/useFarmRole";
import { TaskForm } from "@/app/farm/components/TaskForm";
import type { TaskFormData } from "@/app/farm/components/TaskForm";
import { ExpandableText } from "@/app/farm/components/ExpandableText";
import { LogHoursModal } from "@/app/farm/components/LogHoursModal";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const now = new Date();

export default function WorkerGoalsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<FarmMember[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [hoursPromptTask, setHoursPromptTask] = useState<Task | null>(null);
  const [loggingHours, setLoggingHours] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "today" | "overdue">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"none" | "assignee">("assignee");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Task | null>(null);

  // "all" shows every goal in the farm regardless of timeframe/due-date; the
  // other tabs narrow to a specific calendar period. Default to "all" so the
  // whole team's goals are visible on open.
  const [timeframeTab, setTimeframeTab] = useState<GoalTimeframe | "all">("all");
  const [monthCursor, setMonthCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [yearCursor, setYearCursor] = useState(now.getFullYear());
  const [threeYearStart, setThreeYearStart] = useState(now.getFullYear());

  useFarmSelection({ farms, activeFarmId, setActiveFarmId });
  const { isManager } = useFarmRole(activeFarmId);
  const activeFarmIdRef = useRef(activeFarmId);
  useEffect(() => {
    activeFarmIdRef.current = activeFarmId;
  }, [activeFarmId]);

  useEffect(() => {
    (async () => {
      try {
        const [user, farmRows] = await Promise.all([
          getCurrentUser(),
          getFarms(),
        ]);
        if (user) setUserId(user.id);
        setFarms(farmRows);
      } catch (err) {
        setError(errMsg(err, "Failed to load farms"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function reloadTasks(farmId: string) {
    const taskRows = await getTasks(farmId);
    if (activeFarmIdRef.current !== farmId) return;
    setTasks(taskRows);
  }

  useEffect(() => {
    if (!activeFarmId) return;
    let cancelled = false;
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
        if (cancelled) return;
        setZones(zoneRows);
        setCrops(cropRows);
        setTasks(taskRows);
        setMembers(memberRows);
      } catch (err) {
        if (!cancelled) setError(errMsg(err, "Failed to load goals"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeFarmId]);

  const activeFarm = useMemo(
    () => farms.find((f) => f.id === activeFarmId) ?? null,
    [farms, activeFarmId]
  );

  const today = new Date().toISOString().slice(0, 10);

  function navigatePeriod(direction: -1 | 1) {
    if (timeframeTab === "month") {
      setMonthCursor((prev) => {
        let month = prev.month + direction;
        let year = prev.year;
        if (month > 12) { month = 1; year += 1; }
        if (month < 1) { month = 12; year -= 1; }
        return { year, month };
      });
    } else if (timeframeTab === "year") {
      setYearCursor((prev) => prev + direction);
    } else {
      setThreeYearStart((prev) => prev + direction * 3);
    }
  }

  const periodLabel =
    timeframeTab === "all"
      ? "All goals"
      : timeframeTab === "month"
      ? `${MONTH_NAMES[monthCursor.month - 1]} ${monthCursor.year}`
      : timeframeTab === "year"
      ? `${yearCursor}`
      : `${threeYearStart} – ${threeYearStart + 2}`;

  const periodTasks = useMemo(() => {
    // "All" view: every goal in the farm, including ones with no due date and
    // any timeframe — nothing is hidden by the calendar filter.
    if (timeframeTab === "all") return tasks;
    return tasks.filter((task) => {
      const tf = task.goal_timeframe ?? "month";
      if (tf !== timeframeTab) return false;
      if (!task.due_date) return false;
      const year = parseInt(task.due_date.slice(0, 4), 10);
      if (timeframeTab === "month") {
        const month = parseInt(task.due_date.slice(5, 7), 10);
        return year === monthCursor.year && month === monthCursor.month;
      }
      if (timeframeTab === "year") return year === yearCursor;
      return year >= threeYearStart && year <= threeYearStart + 2;
    });
  }, [tasks, timeframeTab, monthCursor, yearCursor, threeYearStart]);

  // Narrow the period's goals to the chosen person (everyone / unassigned /
  // a specific member) before splitting into open + completed.
  const scopedTasks = useMemo(() => {
    if (assigneeFilter === "all") return periodTasks;
    if (assigneeFilter === "__unassigned__") return periodTasks.filter((t) => !t.assigned_to);
    return periodTasks.filter((t) => t.assigned_to === assigneeFilter);
  }, [periodTasks, assigneeFilter]);

  const openTasks = useMemo(() => {
    const open = scopedTasks.filter(
      (t) => t.status === "todo" || t.status === "in_progress"
    );
    if (timeframeTab === "month") {
      if (filter === "today") return open.filter((t) => t.due_date === today);
      if (filter === "overdue") return open.filter((t) => t.due_date && t.due_date < today);
    }
    return open;
  }, [scopedTasks, filter, today, timeframeTab]);

  const memberEmailMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) map[m.profile_id] = m.user_email ?? m.profile_id;
    return map;
  }, [members]);

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
    for (const [assignee, assigneeTasks] of Object.entries(byAssignee).sort(([a], [b]) =>
      (memberEmailMap[a] ?? a).localeCompare(memberEmailMap[b] ?? b)
    )) {
      groups.push({ label: memberEmailMap[assignee] ?? assignee, key: assignee, tasks: assigneeTasks });
    }
    return groups;
  }, [openTasks, groupBy, memberEmailMap]);

  const completedTasks = scopedTasks.filter(
    (t) => t.status === "done" || t.status === "cancelled"
  );

  async function handleCreateGoal(data: TaskFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      const title = data.title.trim();
      if (!title) throw new Error("Goal title is required.");

      const { error: insertError } = await supabase.from("tasks").insert({
        farm_id: activeFarmId,
        zone_id: data.zone_id || null,
        crop_id: data.crop_id || null,
        assigned_to: data.assigned_to || null,
        title,
        description: data.description.trim() || null,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date || null,
        proof_required: data.proof_required,
        goal_timeframe: data.goal_timeframe,
      });
      if (insertError) throw insertError;

      await reloadTasks(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to create goal"));
      return false;
    }
  }

  function goalToForm(t: Task): TaskFormData {
    return {
      title: t.title,
      description: t.description ?? "",
      zone_id: t.zone_id ?? "",
      crop_id: t.crop_id ?? "",
      assigned_to: t.assigned_to ?? "",
      status: t.status ?? "todo",
      priority: t.priority ?? "medium",
      due_date: t.due_date ?? "",
      proof_required: !!t.proof_required,
      goal_timeframe: t.goal_timeframe ?? "month",
    };
  }

  async function handleUpdateGoal(data: TaskFormData): Promise<boolean> {
    if (!activeFarmId || !editingGoal) return false;
    try {
      setError("");
      const title = data.title.trim();
      if (!title) throw new Error("Goal title is required.");

      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          zone_id: data.zone_id || null,
          crop_id: data.crop_id || null,
          assigned_to: data.assigned_to || null,
          title,
          description: data.description.trim() || null,
          status: data.status,
          priority: data.priority,
          due_date: data.due_date || null,
          proof_required: data.proof_required,
          goal_timeframe: data.goal_timeframe,
        })
        .eq("id", editingGoal.id);
      if (updateError) throw updateError;

      await reloadTasks(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to update goal"));
      return false;
    }
  }

  async function handleDeleteGoal(id: string) {
    if (!activeFarmId) return;
    try {
      setDeletingId(id);
      setError("");
      const { error: deleteError } = await supabase.from("tasks").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await reloadTasks(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to delete goal"));
    } finally {
      setDeletingId(null);
    }
  }

  async function completeTaskNow(task: Task) {
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
          : "Goal marked done",
      });

      await reloadTasks(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to complete goal"));
    } finally {
      setCompletingTaskId(null);
    }
  }

  function handleComplete(task: Task) {
    setHoursPromptTask(task);
  }

  async function handleLogHoursAndComplete(data: { hours: number; workerName: string; notes: string }) {
    if (!activeFarmId || !hoursPromptTask) return;
    try {
      setLoggingHours(true);
      setError("");
      const { error: insertError } = await supabase.from("work_hours").insert({
        farm_id: activeFarmId,
        date: new Date().toISOString().slice(0, 10),
        worker_name: data.workerName,
        hours: data.hours,
        role: "operational",
        notes: data.notes || null,
      });
      if (insertError) throw insertError;
      await completeTaskNow(hoursPromptTask);
      setHoursPromptTask(null);
    } catch (err) {
      setError(errMsg(err, "Failed to log hours"));
    } finally {
      setLoggingHours(false);
    }
  }

  async function handleSkipHoursAndComplete() {
    if (!hoursPromptTask) return;
    const task = hoursPromptTask;
    setHoursPromptTask(null);
    await completeTaskNow(task);
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
      await reloadTasks(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to start goal"));
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Worker Goal View
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {activeFarm?.name ?? "Goals"}
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
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "month", label: "Month" },
                  { key: "year", label: "Year" },
                  { key: "3year", label: "3-Year" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeframeTab(key)}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                    timeframeTab === key
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-3">
              {timeframeTab === "all" ? (
                <span className="text-sm font-semibold">{periodLabel}</span>
              ) : (
                <>
                  <button
                    onClick={() => navigatePeriod(-1)}
                    aria-label="Previous period"
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
                  >
                    ‹
                  </button>
                  <span className="text-sm font-semibold">{periodLabel}</span>
                  <button
                    onClick={() => navigatePeriod(1)}
                    aria-label="Next period"
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
                {timeframeTab === "month" && (
                  <>
                    {(
                      [
                        { key: "all", label: `All open (${scopedTasks.filter((t) => t.status === "todo" || t.status === "in_progress").length})` },
                        { key: "today", label: `Due today (${scopedTasks.filter((t) => t.due_date === today && t.status !== "done" && t.status !== "cancelled").length})` },
                        { key: "overdue", label: `Overdue (${scopedTasks.filter((t) => t.due_date && t.due_date < today && t.status !== "done" && t.status !== "cancelled").length})` },
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
                  </>
                )}
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  aria-label="Filter goals by person"
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 outline-none transition hover:bg-zinc-100 focus:border-zinc-900"
                >
                  <option value="all">Everyone</option>
                  <option value="__unassigned__">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.profile_id} value={m.profile_id}>
                      {m.user_email ?? m.profile_id}
                    </option>
                  ))}
                </select>
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
                {isManager && (
                  <button
                    onClick={() => setShowCreateForm((v) => !v)}
                    className="ml-auto rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                  >
                    {showCreateForm ? "Cancel" : "+ New goal"}
                  </button>
                )}
            </div>

            {showCreateForm && (
              <div className="mb-6">
                <TaskForm
                  key={timeframeTab}
                  zones={zones}
                  crops={crops}
                  members={members}
                  defaultZoneId=""
                  defaultTimeframe={timeframeTab === "all" ? "month" : timeframeTab}
                  onSubmit={async (data) => {
                    const ok = await handleCreateGoal(data);
                    if (ok) setShowCreateForm(false);
                    return ok;
                  }}
                />
              </div>
            )}

            <div className="space-y-6">
              {openTasks.length === 0 ? (
                <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
                  No goals match this view.
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
                  const isDeleting = deletingId === task.id;
                  const isToday = task.due_date === today;
                  const isOverdue = task.due_date ? task.due_date < today : false;
                  // Everyone can see every goal. You can act on your own goals
                  // and on unassigned ("general") goals anyone may pick up;
                  // goals assigned to someone else are read-only here.
                  const canAct = !!userId && (task.assigned_to === userId || !task.assigned_to);
                  return (
                    <div
                      key={task.id}
                      className={`rounded-2xl border bg-white p-4 shadow-sm ${
                        timeframeTab === "month" && isOverdue
                          ? "border-rose-200"
                          : timeframeTab === "month" && isToday
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
                        {timeframeTab === "month" && isToday && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            today
                          </span>
                        )}
                        {timeframeTab === "month" && isOverdue && (
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
                        {task.crop?.[0]?.crop_name ?? "General goal"}
                        <span className="mx-2">·</span>
                        {formatDate(task.due_date)}
                      </div>

                      {task.assigned_to && groupBy === "none" ? (
                        <p className="mt-1.5 text-xs text-indigo-600 font-medium">{memberEmailMap[task.assigned_to] ?? task.assigned_to}</p>
                      ) : null}

                      {task.description && (
                        <ExpandableText text={task.description} className="mt-2 text-sm text-zinc-500" />
                      )}

                      {canAct || isManager ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(canAct || isManager) && task.status === "todo" && (
                            <button
                              onClick={() => handleStartTask(task)}
                              className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                            >
                              Start goal
                            </button>
                          )}
                          {(canAct || isManager) && (
                            <button
                              onClick={() => handleComplete(task)}
                              disabled={isCompleting}
                              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {isCompleting ? "Completing..." : "Mark done"}
                            </button>
                          )}
                          {/* Editing and deleting goals is a manager action. */}
                          {isManager && (
                            <button
                              onClick={() => setEditingGoal(task)}
                              className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                            >
                              Edit
                            </button>
                          )}
                          {isManager && (
                            <button
                              onClick={() => handleDeleteGoal(task.id)}
                              disabled={isDeleting}
                              className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-zinc-400">
                          Assigned to {task.assigned_to ? memberEmailMap[task.assigned_to] ?? "someone else" : "someone else"} — view only
                        </p>
                      )}
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
                        {task.crop?.[0]?.crop_name ?? "General goal"}
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

      {hoursPromptTask && (
        <LogHoursModal
          taskTitle={hoursPromptTask.title}
          defaultWorkerName={
            hoursPromptTask.assigned_to ? memberEmailMap[hoursPromptTask.assigned_to] ?? "" : ""
          }
          saving={loggingHours}
          onConfirm={handleLogHoursAndComplete}
          onSkip={handleSkipHoursAndComplete}
          onClose={() => setHoursPromptTask(null)}
        />
      )}

      {editingGoal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6 sm:items-center sm:py-10">
          <div className="w-full max-w-lg">
            <TaskForm
              key={editingGoal.id}
              zones={zones}
              crops={crops}
              members={members}
              defaultZoneId=""
              initial={goalToForm(editingGoal)}
              heading="Edit goal"
              subheading="Update this goal's details and save."
              submitLabel="Save changes"
              savingLabel="Saving..."
              resetOnSuccess={false}
              onSubmit={async (data) => {
                const ok = await handleUpdateGoal(data);
                if (ok) setEditingGoal(null);
                return ok;
              }}
            />
            <button
              onClick={() => setEditingGoal(null)}
              className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
