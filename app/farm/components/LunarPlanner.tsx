"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "@/lib/supabase";
import type { FarmMember } from "@/lib/farm";
import { ExpandableText } from "@/app/farm/components/ExpandableText";
import { LogHoursModal } from "@/app/farm/components/LogHoursModal";
import {
  Moon,
  Sprout,
  Scissors,
  Wheat,
  Droplets,
  Droplet,
  Layers,
  Axe,
  Beef,
  Recycle,
  Bug,
  Leaf,
  Apple,
  FlaskConical,
  Trash2,
  CircleDot,
  Plus,
  Pencil,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Bell,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  MOON_PHASES,
  TASK_CATEGORIES,
  REFERENCE_GUIDE,
  REFERENCE_NOTE,
  PHASE_GUIDANCE,
  PHASE_HEADLINE,
  PHASE_THEME,
  PHASE_ICONS,
  PHASE_MOON_EMOJI,
  BIODYNAMIC_ICONS,
  RECOMMENDATION_TEMPLATES,
  isAdvisory,
  toISODate,
  fromISODate,
  addDays,
  addMonths,
  startOfMonth,
  formatDayLabel,
  calcMoonPhase,
  moonAgeFraction,
  fractionDistance,
  type MoonPhase,
  type BiodynamicIconKey,
} from "@/app/lunar-planner/lunar-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ViewMode = "1day" | "7day" | "30day";

interface LunarDay {
  id: string;
  date: string;
  calculated_moon_phase: string | null;
  manual_moon_phase: string | null;
  moon_phase_override: boolean | null;
  notes: string | null;
}

interface LunarTask {
  id: string;
  lunar_day_id: string | null;
  date: string;
  title: string;
  category: string | null;
  crop_or_activity: string | null;
  notes: string | null;
  status: string | null;
  reminder_date: string | null;
  reminder_note: string | null;
  reminder_status: string | null;
  assigned_to: string | null;
  carried_over_from: string | null;
}

interface TaskForm {
  title: string;
  category: string;
  crop_or_activity: string;
  notes: string;
  status: string;
  date: string;
  reminder_date: string;
  reminder_note: string;
  reminder_status: string;
  assigned_to: string;
}

const BLANK_TASK: TaskForm = {
  title: "",
  category: "Planting",
  crop_or_activity: "",
  notes: "",
  status: "planned",
  date: "",
  reminder_date: "",
  reminder_note: "",
  reminder_status: "pending",
  assigned_to: "",
};

const TASK_SELECT =
  "id, lunar_day_id, date, title, category, crop_or_activity, notes, status, reminder_date, reminder_note, reminder_status, assigned_to, carried_over_from";
const DAY_SELECT =
  "id, date, calculated_moon_phase, manual_moon_phase, moon_phase_override, notes";

// Icon per task category.
const CATEGORY_ICON: Record<string, LucideIcon> = {
  Planting: Sprout,
  Fertilising: FlaskConical,
  Pruning: Scissors,
  Harvesting: Wheat,
  Weeding: Trash2,
  Watering: Droplets,
  Soil: Layers,
  Processing: Axe,
  Livestock: Beef,
  Compost: Recycle,
  "Pest Control": Bug,
  "Seed Soaking": Droplet,
  "Medicinal Herbs": Leaf,
  "Fruit Trees": Apple,
  Other: CircleDot,
};

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

function isMoonPhase(v: string | null | undefined): v is MoonPhase {
  return !!v && (MOON_PHASES as readonly string[]).includes(v);
}

// Emoji + label for a biodynamic icon key, with phase-aware moon glyph.
function iconFor(key: BiodynamicIconKey, phase: MoonPhase) {
  const base = BIODYNAMIC_ICONS[key];
  return key === "moon" ? { emoji: PHASE_MOON_EMOJI[phase], label: phase } : base;
}

type Props = {
  // When true, renders as a section embedded in another page (no page
  // chrome / auth redirect of its own) instead of a standalone full page.
  embedded?: boolean;
  // When provided, the Tasks view becomes a shared team task list scoped to
  // this farm (visible/assignable to any farm member) instead of a personal,
  // user-only list.
  farmId?: string;
  members?: FarmMember[];
};

export default function LunarPlanner({ embedded = false, farmId, members }: Props) {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tasks" | "lunar">("tasks");
  const [error, setError] = useState("");

  const [view, setView] = useState<ViewMode>("7day");
  const [anchorISO, setAnchorISO] = useState<string>(() => toISODate(new Date()));

  const [days, setDays] = useState<Record<string, LunarDay>>({});
  const [tasks, setTasks] = useState<LunarTask[]>([]);
  const [dueReminders, setDueReminders] = useState<LunarTask[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNoteFor, setSavingNoteFor] = useState<string | null>(null);

  const [taskModal, setTaskModal] = useState<{ date: string; taskId?: string } | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(BLANK_TASK);
  const [savingTask, setSavingTask] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [busyReminderId, setBusyReminderId] = useState<string | null>(null);
  const [hoursPromptTask, setHoursPromptTask] = useState<LunarTask | null>(null);
  const [loggingHours, setLoggingHours] = useState(false);

  const todayISO = toISODate(new Date());
  const anchor = useMemo(() => fromISODate(anchorISO), [anchorISO]);

  // -------------------------------------------------------------------------
  // Visible date range + list of days to render
  // -------------------------------------------------------------------------
  const { rangeStart, rangeEnd, visibleDates } = useMemo(() => {
    if (view === "1day") {
      return { rangeStart: anchorISO, rangeEnd: anchorISO, visibleDates: [anchorISO] };
    }
    if (view === "7day") {
      const dates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(anchor, i)));
      return { rangeStart: dates[0], rangeEnd: dates[6], visibleDates: dates };
    }
    const first = startOfMonth(anchor);
    const next = addMonths(first, 1);
    const dates: string[] = [];
    for (let d = new Date(first); d < next; d = addDays(d, 1)) dates.push(toISODate(d));
    return { rangeStart: dates[0], rangeEnd: dates[dates.length - 1], visibleDates: dates };
  }, [view, anchor, anchorISO]);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------
  const loadRange = useCallback(async (uid: string, start: string, end: string) => {
    let taskQuery = supabase
      .from("lunar_tasks")
      .select(TASK_SELECT)
      .gte("date", start)
      .lte("date", end)
      .order("created_at", { ascending: true });
    taskQuery = farmId ? taskQuery.eq("farm_id", farmId) : taskQuery.eq("user_id", uid);

    const [dayRes, taskRes] = await Promise.all([
      supabase
        .from("lunar_days")
        .select(DAY_SELECT)
        .eq("user_id", uid)
        .gte("date", start)
        .lte("date", end),
      taskQuery,
    ]);
    if (dayRes.error) throw dayRes.error;
    if (taskRes.error) throw taskRes.error;
    const dayMap: Record<string, LunarDay> = {};
    for (const d of (dayRes.data ?? []) as LunarDay[]) dayMap[d.date] = d;
    setDays(dayMap);
    setTasks((taskRes.data ?? []) as LunarTask[]);
  }, [farmId]);

  const loadReminders = useCallback(async (uid: string) => {
    let query = supabase
      .from("lunar_tasks")
      .select(TASK_SELECT)
      .eq("reminder_status", "pending")
      .not("reminder_date", "is", null)
      .lte("reminder_date", toISODate(new Date()))
      .order("reminder_date", { ascending: true });
    query = farmId ? query.eq("farm_id", farmId) : query.eq("user_id", uid);
    const { data, error: e } = await query;
    if (e) throw e;
    setDueReminders((data ?? []) as LunarTask[]);
  }, [farmId]);

  // Roll any planned (not done) task whose scheduled day has already passed
  // forward onto today, so overdue tasks stay visible instead of being
  // stranded in the past. The first day it was originally scheduled for is
  // preserved in carried_over_from (only set when still empty) so the UI can
  // show a "task probably for <date>" hint.
  const rollOverdueTasks = useCallback(async (uid: string) => {
    const today = toISODate(new Date());
    let query = supabase
      .from("lunar_tasks")
      .select("id, date, carried_over_from")
      .lt("date", today)
      .neq("status", "done");
    query = farmId ? query.eq("farm_id", farmId) : query.eq("user_id", uid);
    const { data, error: e } = await query;
    if (e) throw e;
    const overdue = (data ?? []) as {
      id: string;
      date: string;
      carried_over_from: string | null;
    }[];
    if (overdue.length === 0) return;
    await Promise.all(
      overdue.map((t) =>
        supabase
          .from("lunar_tasks")
          .update({ date: today, carried_over_from: t.carried_over_from ?? t.date })
          .eq("id", t.id)
      )
    );
  }, [farmId]);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/login");
          return;
        }
        setUserId(user.id);
      } catch (err) {
        setError(errMsg(err, "Failed to load session"));
        setLoading(false);
      }
    })();
  }, [router]);

  // Roll overdue tasks forward at most once per mount, before the first load,
  // so the moved tasks show up on today when the range is fetched.
  const rolledOverRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        if (!rolledOverRef.current) {
          rolledOverRef.current = true;
          await rollOverdueTasks(userId);
        }
        await Promise.all([loadRange(userId, rangeStart, rangeEnd), loadReminders(userId)]);
      } catch (err) {
        if (!cancelled) setError(errMsg(err, "Failed to load planner"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, rangeStart, rangeEnd, loadRange, loadReminders, rollOverdueTasks]);

  async function refresh() {
    if (!userId) return;
    try {
      await Promise.all([loadRange(userId, rangeStart, rangeEnd), loadReminders(userId)]);
    } catch (err) {
      setError(errMsg(err, "Failed to refresh"));
    }
  }

  // -------------------------------------------------------------------------
  // Phase resolution — calculated by default, manual override when enabled
  // -------------------------------------------------------------------------
  const resolvedPhase = useCallback(
    (dateISO: string): { phase: MoonPhase; overridden: boolean } => {
      const day = days[dateISO];
      if (day?.moon_phase_override && isMoonPhase(day.manual_moon_phase)) {
        return { phase: day.manual_moon_phase, overridden: true };
      }
      return { phase: calcMoonPhase(fromISODate(dateISO)), overridden: false };
    },
    [days]
  );

  const tasksByDate = useMemo(() => {
    const map: Record<string, LunarTask[]> = {};
    for (const t of tasks) (map[t.date] ??= []).push(t);
    return map;
  }, [tasks]);

  const memberEmailMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members ?? []) map[m.profile_id] = m.user_email ?? m.profile_id;
    return map;
  }, [members]);

  // -------------------------------------------------------------------------
  // Best Next 3 Days — scan the next 30 days using calculated phases
  // -------------------------------------------------------------------------
  const bestDays = useMemo(() => {
    const start = fromISODate(todayISO);
    return RECOMMENDATION_TEMPLATES.map((tpl) => {
      let bestISO = "";
      let bestDist = Infinity;
      for (let i = 1; i <= 30; i++) {
        const d = addDays(start, i);
        if (calcMoonPhase(d) !== tpl.phase) continue;
        const dist = fractionDistance(moonAgeFraction(d), tpl.centre);
        if (dist < bestDist) {
          bestDist = dist;
          bestISO = toISODate(d);
        }
      }
      return { tpl, dateISO: bestISO };
    });
  }, [todayISO]);

  // Ensure a lunar_days row exists for a date, returning its id.
  async function ensureDay(dateISO: string, patch?: Partial<LunarDay>): Promise<string> {
    // Prefer the locally loaded day, but fall back to a direct fetch for dates
    // outside the visible range (e.g. when the date picker moves a task to a
    // far-off day) so we never clobber that day's existing notes / override.
    let existing = days[dateISO];
    if (!existing) {
      const { data: fetched } = await supabase
        .from("lunar_days")
        .select(DAY_SELECT)
        .eq("user_id", userId)
        .eq("date", dateISO)
        .maybeSingle();
      if (fetched) existing = fetched as LunarDay;
    }
    const payload: Record<string, unknown> = {
      user_id: userId,
      date: dateISO,
      calculated_moon_phase: calcMoonPhase(fromISODate(dateISO)),
      manual_moon_phase: patch?.manual_moon_phase ?? existing?.manual_moon_phase ?? null,
      moon_phase_override:
        patch?.moon_phase_override ?? existing?.moon_phase_override ?? false,
      notes: patch?.notes ?? existing?.notes ?? null,
    };
    const { data, error: e } = await supabase
      .from("lunar_days")
      .upsert(payload, { onConflict: "user_id,date" })
      .select(DAY_SELECT)
      .single();
    if (e) throw e;
    const row = data as LunarDay;
    setDays((prev) => ({ ...prev, [dateISO]: row }));
    return row.id;
  }

  async function handleToggleOverride(dateISO: string, enabled: boolean) {
    try {
      setError("");
      const current = resolvedPhase(dateISO).phase;
      await ensureDay(dateISO, {
        moon_phase_override: enabled,
        // Seed the manual value from the calculated phase when first enabling.
        manual_moon_phase: enabled
          ? days[dateISO]?.manual_moon_phase ?? current
          : days[dateISO]?.manual_moon_phase ?? null,
      });
    } catch (err) {
      setError(errMsg(err, "Failed to update moon phase"));
    }
  }

  async function handleChangeManualPhase(dateISO: string, phase: MoonPhase) {
    try {
      setError("");
      await ensureDay(dateISO, { moon_phase_override: true, manual_moon_phase: phase });
    } catch (err) {
      setError(errMsg(err, "Failed to update moon phase"));
    }
  }

  async function handleSaveNotes(dateISO: string) {
    const draft = noteDrafts[dateISO];
    if (draft === undefined) return;
    const current = days[dateISO]?.notes ?? "";
    if (draft === current) return;
    try {
      setSavingNoteFor(dateISO);
      setError("");
      await ensureDay(dateISO, { notes: draft.trim() ? draft : null });
    } catch (err) {
      setError(errMsg(err, "Failed to save notes"));
    } finally {
      setSavingNoteFor(null);
    }
  }

  // -------------------------------------------------------------------------
  // Task CRUD
  // -------------------------------------------------------------------------
  function openAddTask(dateISO: string) {
    setTaskForm({ ...BLANK_TASK, date: dateISO });
    setTaskModal({ date: dateISO });
  }

  function openEditTask(task: LunarTask) {
    setTaskForm({
      title: task.title,
      category: task.category ?? "Other",
      crop_or_activity: task.crop_or_activity ?? "",
      notes: task.notes ?? "",
      status: task.status ?? "planned",
      date: task.date,
      reminder_date: task.reminder_date ?? "",
      reminder_note: task.reminder_note ?? "",
      reminder_status: task.reminder_status ?? "pending",
      assigned_to: task.assigned_to ?? "",
    });
    setTaskModal({ date: task.date, taskId: task.id });
  }

  async function handleSaveTask() {
    if (!taskModal) return;
    const title = taskForm.title.trim();
    if (!title) {
      setError("Task title is required.");
      return;
    }
    const targetDate = taskForm.date || taskModal.date;
    if (!targetDate) {
      setError("Task date is required.");
      return;
    }
    try {
      setSavingTask(true);
      setError("");
      const payload = {
        title,
        category: taskForm.category || null,
        crop_or_activity: taskForm.crop_or_activity.trim() || null,
        notes: taskForm.notes.trim() || null,
        status: taskForm.status || "planned",
        reminder_date: taskForm.reminder_date || null,
        reminder_note: taskForm.reminder_note.trim() || null,
        reminder_status: taskForm.reminder_date ? taskForm.reminder_status || "pending" : "pending",
        assigned_to: taskForm.assigned_to || null,
      };
      if (taskModal.taskId) {
        // When the date is changed via the picker, re-home the task on the new
        // day and clear the roll-over hint — the user has deliberately
        // rescheduled it, so it's no longer "probably for" an earlier date.
        const dateChanged = targetDate !== taskModal.date;
        const datePatch = dateChanged
          ? {
              date: targetDate,
              lunar_day_id: await ensureDay(targetDate),
              carried_over_from: null,
            }
          : {};
        const { error: e } = await supabase
          .from("lunar_tasks")
          .update({ ...payload, ...datePatch })
          .eq("id", taskModal.taskId);
        if (e) throw e;
      } else {
        const dayId = await ensureDay(targetDate);
        const { error: e } = await supabase.from("lunar_tasks").insert({
          ...payload,
          user_id: userId,
          farm_id: farmId ?? null,
          lunar_day_id: dayId,
          date: targetDate,
        });
        if (e) throw e;
      }
      await refresh();
      setTaskModal(null);
    } catch (err) {
      setError(errMsg(err, "Failed to save task"));
    } finally {
      setSavingTask(false);
    }
  }

  async function setTaskStatus(task: LunarTask, next: string) {
    try {
      setBusyTaskId(task.id);
      setError("");
      const { error: e } = await supabase
        .from("lunar_tasks")
        .update({ status: next })
        .eq("id", task.id);
      if (e) throw e;
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    } catch (err) {
      setError(errMsg(err, "Failed to update task"));
    } finally {
      setBusyTaskId(null);
    }
  }

  function handleToggleDone(task: LunarTask) {
    if (task.status === "done") {
      setTaskStatus(task, "planned");
    } else if (farmId) {
      // Only prompt for hours when there's a farm to attribute them to.
      setHoursPromptTask(task);
    } else {
      setTaskStatus(task, "done");
    }
  }

  async function handleLogHoursAndComplete(data: { hours: number; workerName: string; notes: string }) {
    if (!farmId || !hoursPromptTask) return;
    try {
      setLoggingHours(true);
      setError("");
      const { error: insertError } = await supabase.from("work_hours").insert({
        farm_id: farmId,
        date: toISODate(new Date()),
        worker_name: data.workerName,
        hours: data.hours,
        role: "operational",
        notes: data.notes || null,
      });
      if (insertError) throw insertError;
      await setTaskStatus(hoursPromptTask, "done");
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
    await setTaskStatus(task, "done");
  }

  async function handleDeleteTask(task: LunarTask) {
    try {
      setBusyTaskId(task.id);
      setError("");
      const { error: e } = await supabase.from("lunar_tasks").delete().eq("id", task.id);
      if (e) throw e;
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setDueReminders((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setError(errMsg(err, "Failed to delete task"));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleSetReminderStatus(task: LunarTask, status: "done" | "skipped") {
    try {
      setBusyReminderId(task.id);
      setError("");
      const { error: e } = await supabase
        .from("lunar_tasks")
        .update({ reminder_status: status })
        .eq("id", task.id);
      if (e) throw e;
      setDueReminders((prev) => prev.filter((t) => t.id !== task.id));
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, reminder_status: status } : t))
      );
    } catch (err) {
      setError(errMsg(err, "Failed to update reminder"));
    } finally {
      setBusyReminderId(null);
    }
  }

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  function navigate(direction: -1 | 1) {
    if (view === "1day") setAnchorISO(toISODate(addDays(anchor, direction)));
    else if (view === "7day") setAnchorISO(toISODate(addDays(anchor, direction * 7)));
    else setAnchorISO(toISODate(addMonths(anchor, direction)));
  }

  function goToday() {
    setAnchorISO(toISODate(new Date()));
  }

  function openDay(dateISO: string) {
    setAnchorISO(dateISO);
    setView("1day");
  }

  const periodLabel = useMemo(() => {
    if (view === "1day") return formatDayLabel(anchor, { weekday: true, year: true });
    if (view === "7day") {
      const end = addDays(anchor, 6);
      return `${formatDayLabel(anchor, { short: true })} – ${formatDayLabel(end, {
        short: true,
        year: true,
      })}`;
    }
    return anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }, [view, anchor]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <main className={embedded ? "" : "min-h-screen bg-stone-50 text-zinc-900"}>
      <div className={embedded ? "" : "mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8"}>
        {embedded ? (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Moon className="h-5 w-5 shrink-0 text-indigo-500" />
            <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-1">
              {(
                [
                  ["tasks", "Planner"],
                  ["lunar", "Lunar Farming Planner"],
                ] as [typeof tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    tab === key ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === "lunar" && (
              <span className="text-sm text-zinc-500">Plan farm goals by the rhythm of the moon.</span>
            )}
          </div>
        ) : (
          <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Shamba Online
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Moon className="h-6 w-6 shrink-0 text-indigo-500" />
                  <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-1">
                    {(
                      [
                        ["tasks", "Planner"],
                        ["lunar", "Lunar Farming Planner"],
                      ] as [typeof tab, string][]
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                          tab === key ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {tab === "lunar" && (
                  <p className="mt-2 text-sm text-zinc-500">
                    Plan farm tasks by the rhythm of the moon.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/farm"
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                >
                  ← Farm
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/login");
                  }}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* View switch & navigation */}
        <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-1">
            {(
              [
                ["1day", "1 Day"],
                ["7day", "7 Day"],
                ["30day", "Month"],
              ] as [ViewMode, string][]
            ).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  view === mode ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="mr-1 hidden text-sm font-medium text-zinc-600 sm:inline">
              {periodLabel}
            </span>
            <button
              onClick={() => navigate(-1)}
              aria-label="Previous period"
              className="rounded-full border border-zinc-200 p-2 text-zinc-600 transition hover:bg-zinc-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToday}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Today
            </button>
            <button
              onClick={() => navigate(1)}
              aria-label="Next period"
              className="rounded-full border border-zinc-200 p-2 text-zinc-600 transition hover:bg-zinc-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mb-4 text-sm font-medium text-zinc-500 sm:hidden">{periodLabel}</p>

        {/* Day cards / month grid */}
        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">
            Loading…
          </div>
        ) : view === "30day" ? (
          <MonthGrid
            dates={visibleDates}
            todayISO={todayISO}
            resolvedPhase={resolvedPhase}
            tasksByDate={tasksByDate}
            onOpenDay={openDay}
            onAddTask={openAddTask}
            showLunar={tab === "lunar"}
          />
        ) : (
          <div
            className={
              view === "7day"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid grid-cols-1 gap-4"
            }
          >
            {visibleDates.map((dateISO) => {
              const { phase, overridden } = resolvedPhase(dateISO);
              return (
                <DayCard
                  key={dateISO}
                  dateISO={dateISO}
                  large={view === "1day"}
                  isToday={dateISO === todayISO}
                  phase={phase}
                  overridden={overridden}
                  tasks={tasksByDate[dateISO] ?? []}
                  noteValue={noteDrafts[dateISO] ?? days[dateISO]?.notes ?? ""}
                  savingNote={savingNoteFor === dateISO}
                  busyTaskId={busyTaskId}
                  onToggleOverride={(en) => handleToggleOverride(dateISO, en)}
                  onChangeManualPhase={(p) => handleChangeManualPhase(dateISO, p)}
                  onNoteChange={(v) => setNoteDrafts((prev) => ({ ...prev, [dateISO]: v }))}
                  onNoteBlur={() => handleSaveNotes(dateISO)}
                  onAddTask={() => openAddTask(dateISO)}
                  onEditTask={openEditTask}
                  onToggleDone={handleToggleDone}
                  onDeleteTask={handleDeleteTask}
                  showLunar={tab === "lunar"}
                  memberEmailMap={memberEmailMap}
                />
              );
            })}
          </div>
        )}

        {/* Lunar Farming Guide — permanent reference, lunar mode only */}
        {tab === "lunar" && (
          <section className="mb-6 mt-6 rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-indigo-900">
              <BookOpen className="h-5 w-5" />
              Lunar Farming Guide
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {REFERENCE_GUIDE.map(({ phase, summary }) => {
                const theme = PHASE_THEME[phase];
                return (
                  <div key={phase} className={`rounded-2xl border ${theme.ring} bg-white/80 p-4`}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span>{PHASE_MOON_EMOJI[phase]}</span>
                      <span className="font-semibold">{phase}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-600">{summary}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 rounded-2xl bg-indigo-50 px-4 py-3 text-sm italic leading-relaxed text-indigo-800">
              {REFERENCE_NOTE}
            </p>
          </section>
        )}

        {/* Reminders due today */}
        {dueReminders.length > 0 && (
          <section className="mb-6 rounded-3xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-rose-900">
              <Bell className="h-5 w-5" />
              Reminders due today
              <span className="rounded-full bg-rose-200 px-2 py-0.5 text-xs font-semibold text-rose-800">
                {dueReminders.length}
              </span>
            </h2>
            <ul className="space-y-2">
              {dueReminders.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 rounded-2xl border border-rose-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <button
                      onClick={() => openDay(r.date)}
                      className="text-left font-medium text-zinc-800 hover:underline"
                    >
                      {r.reminder_note?.trim() || r.title}
                    </button>
                    <p className="text-xs text-zinc-500">
                      {r.title}
                      {r.reminder_date && (
                        <> · due {formatDayLabel(fromISODate(r.reminder_date), { short: true })}</>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleSetReminderStatus(r, "done")}
                      disabled={busyReminderId === r.id}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => handleSetReminderStatus(r, "skipped")}
                      disabled={busyReminderId === r.id}
                      className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
                    >
                      Skip
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Best Next 3 Days — lunar mode only */}
        {tab === "lunar" && (
          <section className="mb-6 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-emerald-900">
              <Sparkles className="h-5 w-5" />
              Best Next 3 Days
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {bestDays.map(({ tpl, dateISO }) => {
                const theme = PHASE_THEME[tpl.phase];
                return (
                  <div key={tpl.key} className={`rounded-2xl border ${theme.ring} bg-white p-4 shadow-sm`}>
                    <p className="text-sm font-semibold text-zinc-800">{tpl.title}</p>
                    {dateISO ? (
                      <button
                        onClick={() => openDay(dateISO)}
                        className="mt-1 block text-left text-sm text-zinc-500 hover:underline"
                      >
                        {formatDayLabel(fromISODate(dateISO), { weekday: true })}
                      </button>
                    ) : (
                      <p className="mt-1 text-sm text-zinc-400">No suitable day soon</p>
                    )}
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}
                      >
                        <span aria-hidden>{PHASE_MOON_EMOJI[tpl.phase]}</span>
                        {tpl.phase}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs text-zinc-600">
                      {tpl.tasks.map((t) => (
                        <li key={t} className="flex gap-1.5">
                          <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${theme.dot}`} />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Task modal */}
      {taskModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6 sm:items-center sm:py-10">
          <div className="flex w-full max-w-lg max-h-[calc(100vh-2rem)] flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl sm:max-h-[calc(100vh-5rem)]">
            <h2 className="mb-1 text-lg font-semibold">
              {taskModal.taskId ? "Edit task" : "Add task"}
            </h2>
            <p className="mb-5 text-sm text-zinc-500">
              {formatDayLabel(fromISODate(taskForm.date || taskModal.date), {
                weekday: true,
                year: true,
              })}
            </p>
            <div className="space-y-3 overflow-y-auto pr-1">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Title</label>
                <input
                  autoFocus
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Plant root tubers: ginger, turmeric"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Date</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  value={taskForm.date}
                  onChange={(e) => setTaskForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Category</label>
                  <select
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    value={taskForm.category}
                    onChange={(e) => setTaskForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    {TASK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Status</label>
                  <select
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    value={taskForm.status}
                    onChange={(e) => setTaskForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="planned">Planned</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                  Crop / activity <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  value={taskForm.crop_or_activity}
                  onChange={(e) => setTaskForm((p) => ({ ...p, crop_or_activity: e.target.value }))}
                  placeholder="Ginger, turmeric…"
                />
              </div>
              {members && members.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">Assign to</label>
                  <select
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    value={taskForm.assigned_to}
                    onChange={(e) => setTaskForm((p) => ({ ...p, assigned_to: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.profile_id} value={m.profile_id}>
                        {m.user_email ?? m.profile_id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Notes</label>
                <textarea
                  className="min-h-[60px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              {/* Reminder */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Bell className="h-3.5 w-3.5" /> Reminder (optional)
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                      Remind me on
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      value={taskForm.reminder_date}
                      onChange={(e) =>
                        setTaskForm((p) => ({ ...p, reminder_date: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                      Reminder status
                    </label>
                    <select
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-400"
                      value={taskForm.reminder_status}
                      disabled={!taskForm.reminder_date}
                      onChange={(e) =>
                        setTaskForm((p) => ({ ...p, reminder_status: e.target.value }))
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="done">Done</option>
                      <option value="skipped">Skipped</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                    Reminder note
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    value={taskForm.reminder_note}
                    onChange={(e) =>
                      setTaskForm((p) => ({ ...p, reminder_note: e.target.value }))
                    }
                    placeholder="Check ginger bed, water seedlings…"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2 border-t border-zinc-100 pt-4">
              <button
                onClick={handleSaveTask}
                disabled={savingTask}
                className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {savingTask ? "Saving…" : "Save task"}
              </button>
              <button
                onClick={() => setTaskModal(null)}
                className="rounded-2xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
    </main>
  );
}

// ---------------------------------------------------------------------------
// Biodynamic icon row
// ---------------------------------------------------------------------------
function IconRow({ phase, max }: { phase: MoonPhase; max?: number }) {
  const keys = max ? PHASE_ICONS[phase].slice(0, max) : PHASE_ICONS[phase];
  return (
    <div className="flex flex-wrap gap-1">
      {keys.map((k) => {
        const ic = iconFor(k, phase);
        return (
          <span
            key={k}
            title={ic.label}
            className="inline-flex h-6 items-center rounded-full bg-zinc-100 px-1.5 text-sm leading-none"
          >
            <span aria-hidden>{ic.emoji}</span>
            <span className="sr-only">{ic.label}</span>
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Today's Lunar Guidance block
// ---------------------------------------------------------------------------
function GuidanceBlock({ phase, theme }: { phase: MoonPhase; theme: typeof PHASE_THEME[MoonPhase] }) {
  return (
    <div className={`rounded-2xl ${theme.chip} px-3 py-2.5`}>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        <Moon className="h-3.5 w-3.5" /> Today&apos;s Lunar Guidance
      </p>
      <ul className="space-y-0.5 text-xs leading-snug">
        {PHASE_GUIDANCE[phase].map((g, i) => {
          const advisory = isAdvisory(g);
          return (
            <li key={i} className={`flex gap-1.5 ${advisory ? "opacity-70" : ""}`}>
              <span
                className={`mt-1 shrink-0 ${
                  advisory ? "text-rose-500" : ""
                }`}
              >
                {advisory ? "⚠" : <span className={`inline-block h-1 w-1 rounded-full ${theme.dot}`} />}
              </span>
              <span className={advisory ? "italic" : ""}>{g}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day card (1-day + 7-day views)
// ---------------------------------------------------------------------------
interface DayCardProps {
  dateISO: string;
  large: boolean;
  isToday: boolean;
  phase: MoonPhase;
  overridden: boolean;
  tasks: LunarTask[];
  noteValue: string;
  savingNote: boolean;
  busyTaskId: string | null;
  onToggleOverride: (enabled: boolean) => void;
  onChangeManualPhase: (p: MoonPhase) => void;
  onNoteChange: (v: string) => void;
  onNoteBlur: () => void;
  onAddTask: () => void;
  onEditTask: (t: LunarTask) => void;
  onToggleDone: (t: LunarTask) => void;
  onDeleteTask: (t: LunarTask) => void;
  showLunar: boolean;
  memberEmailMap: Record<string, string>;
}

function DayCard(props: DayCardProps) {
  const {
    dateISO,
    large,
    isToday,
    phase,
    overridden,
    tasks,
    noteValue,
    savingNote,
    busyTaskId,
    onToggleOverride,
    onChangeManualPhase,
    onNoteChange,
    onNoteBlur,
    onAddTask,
    onEditTask,
    onToggleDone,
    onDeleteTask,
    showLunar,
    memberEmailMap,
  } = props;
  const theme = PHASE_THEME[phase];
  const date = fromISODate(dateISO);
  const dayReminders = tasks.filter(
    (t) => t.reminder_date && t.reminder_status === "pending"
  );

  return (
    <div
      className={`flex flex-col rounded-3xl border bg-white shadow-sm transition ${
        isToday ? "border-emerald-400 ring-1 ring-emerald-200" : theme.ring
      } ${large ? "p-6" : "p-4"}`}
    >
      {/* Header: date + phase */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold ${large ? "text-xl" : "text-base"}`}>
              {formatDayLabel(date, { short: !large })}
            </h3>
            {isToday && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Today
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            {date.toLocaleDateString("en-GB", { weekday: "long" })}
          </p>
        </div>
        {showLunar && (
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}
            >
              <span aria-hidden>{PHASE_MOON_EMOJI[phase]}</span>
              {phase}
            </span>
            <p className="mt-1 text-[10px] text-zinc-400">
              {overridden ? "Manual override" : "Automatically calculated"}
            </p>
          </div>
        )}
      </div>

      {/* Biodynamic icons */}
      {showLunar && (
        <div className="mb-3">
          <IconRow phase={phase} />
        </div>
      )}

      {/* Manual moon phase override — editable in 1-day view */}
      {showLunar && large && (
        <div className="mb-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <input
              type="checkbox"
              checked={overridden}
              onChange={(e) => onToggleOverride(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Override moon phase
          </label>
          {overridden && (
            <select
              value={phase}
              onChange={(e) => onChangeManualPhase(e.target.value as MoonPhase)}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-900"
            >
              {MOON_PHASES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Tasks */}
      <div className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Tasks ({tasks.length})
          </span>
          <button
            onClick={onAddTask}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-zinc-800"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-3 text-center text-xs text-zinc-400">
            No tasks yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {tasks.map((t) => {
              const Icon = CATEGORY_ICON[t.category ?? "Other"] ?? CircleDot;
              const done = t.status === "done";
              const busy = busyTaskId === t.id;
              return (
                <li
                  key={t.id}
                  className={`flex items-start gap-2 rounded-xl border px-2.5 py-2 text-sm transition ${
                    done ? "border-emerald-100 bg-emerald-50/60" : "border-zinc-100 bg-zinc-50"
                  }`}
                >
                  <button
                    onClick={() => onToggleDone(t)}
                    disabled={busy}
                    aria-label={done ? "Mark as not done" : "Mark as done"}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-zinc-300 bg-white text-transparent hover:border-emerald-400"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1.5">
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span
                        className={`font-medium break-words ${
                          done ? "text-zinc-400 line-through" : "text-zinc-800"
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                      {t.category && (
                        <span className="rounded-full bg-white px-1.5 py-0.5 ring-1 ring-zinc-200">
                          {t.category}
                        </span>
                      )}
                      {t.crop_or_activity && <span>· {t.crop_or_activity}</span>}
                      {t.reminder_date && t.reminder_status === "pending" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-rose-600 ring-1 ring-rose-100">
                          <Bell className="h-3 w-3" />
                          {formatDayLabel(fromISODate(t.reminder_date), { short: true })}
                        </span>
                      )}
                      {t.carried_over_from && !done && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-700 ring-1 ring-amber-100"
                          title={`Rolled over — originally scheduled for ${formatDayLabel(
                            fromISODate(t.carried_over_from),
                            { weekday: true, year: true }
                          )}`}
                        >
                          ↪ probably for {formatDayLabel(fromISODate(t.carried_over_from), { short: true })}
                        </span>
                      )}
                      {t.assigned_to && (
                        <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-indigo-600 ring-1 ring-indigo-100">
                          {memberEmailMap[t.assigned_to] ?? "Assigned"}
                        </span>
                      )}
                    </div>
                    {t.notes && (
                      <ExpandableText text={t.notes} className="mt-1 text-[11px] leading-snug text-zinc-500" />
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      onClick={() => onEditTask(t)}
                      disabled={busy}
                      aria-label="Edit task"
                      className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTask(t)}
                      disabled={busy}
                      aria-label="Delete task"
                      className="rounded-lg p-1 text-zinc-400 transition hover:bg-rose-100 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Today's Lunar Guidance — lunar mode only */}
      {showLunar && (
        <div className="mb-3">
          <GuidanceBlock phase={phase} theme={theme} />
        </div>
      )}

      {/* Reminders (1-day view) */}
      {large && dayReminders.length > 0 && (
        <div className="mb-3 rounded-2xl border border-rose-100 bg-rose-50/50 px-3 py-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
            <Bell className="h-3.5 w-3.5" /> Reminders
          </p>
          <ul className="space-y-1 text-xs text-zinc-600">
            {dayReminders.map((t) => (
              <li key={t.id} className="flex gap-1.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                <span>
                  {t.reminder_note?.trim() || t.title}
                  {t.reminder_date && (
                    <span className="text-zinc-400">
                      {" "}
                      · {formatDayLabel(fromISODate(t.reminder_date), { short: true })}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      <div className="mt-auto">
        <label className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          Notes {savingNote && <span className="text-zinc-300">saving…</span>}
        </label>
        <textarea
          value={noteValue}
          onChange={(e) => onNoteChange(e.target.value)}
          onBlur={onNoteBlur}
          placeholder="Observations, intentions…"
          className={`w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 ${
            large ? "min-h-[80px]" : "min-h-[52px]"
          }`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month grid (30-day compact view)
// ---------------------------------------------------------------------------
interface MonthGridProps {
  dates: string[];
  todayISO: string;
  resolvedPhase: (d: string) => { phase: MoonPhase; overridden: boolean };
  tasksByDate: Record<string, LunarTask[]>;
  onOpenDay: (d: string) => void;
  onAddTask: (d: string) => void;
  showLunar: boolean;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function MonthGrid(props: MonthGridProps) {
  const { dates, todayISO, resolvedPhase, tasksByDate, onOpenDay, onAddTask, showLunar } = props;
  const firstDate = fromISODate(dates[0]);
  const leadingBlanks = (firstDate.getDay() + 6) % 7;

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAY_LABELS.map((w) => (
          <div
            key={w}
            className="text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400 sm:text-xs"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="min-h-[72px]" />
        ))}
        {dates.map((dateISO) => {
          const date = fromISODate(dateISO);
          const { phase } = resolvedPhase(dateISO);
          const theme = PHASE_THEME[phase];
          const dayTasks = tasksByDate[dateISO] ?? [];
          const isToday = dateISO === todayISO;
          return (
            <div
              key={dateISO}
              className={`group relative flex min-h-[72px] flex-col rounded-xl border p-1.5 transition sm:min-h-[104px] sm:p-2 ${
                isToday
                  ? "border-emerald-400 ring-1 ring-emerald-200"
                  : showLunar
                  ? theme.ring
                  : "border-zinc-200"
              } ${showLunar ? theme.soft : ""} hover:shadow-sm`}
            >
              <button
                onClick={() => onOpenDay(dateISO)}
                className="flex items-center justify-between text-left"
                title={showLunar ? `${phase} — open day` : "Open day"}
              >
                <span
                  className={`text-xs font-semibold sm:text-sm ${
                    isToday ? "text-emerald-700" : "text-zinc-700"
                  }`}
                >
                  {date.getDate()}
                </span>
                {showLunar && (
                  <span aria-hidden className="text-sm leading-none">
                    {PHASE_MOON_EMOJI[phase]}
                  </span>
                )}
              </button>
              {showLunar && (
                <button
                  onClick={() => onOpenDay(dateISO)}
                  className="mt-1 flex flex-1 flex-col text-left"
                  title={phase}
                >
                  <p className="hidden text-[10px] font-medium leading-tight text-zinc-500 sm:block">
                    {PHASE_HEADLINE[phase]}
                  </p>
                  <div className="mt-1 hidden sm:block">
                    <IconRow phase={phase} max={4} />
                  </div>
                </button>
              )}
              {!showLunar && <div className="flex-1" />}
              <div className="mt-1 flex items-center justify-between">
                {dayTasks.length > 0 ? (
                  <span className="rounded-full bg-white/80 px-1.5 text-[9px] font-medium text-zinc-500 ring-1 ring-zinc-200 sm:text-[10px]">
                    {dayTasks.length} task{dayTasks.length > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span />
                )}
                <button
                  onClick={() => onAddTask(dateISO)}
                  aria-label="Add task"
                  className="rounded-md p-0.5 text-zinc-400 opacity-0 transition hover:bg-white hover:text-zinc-700 group-hover:opacity-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
