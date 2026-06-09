"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  X,
  Pencil,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BookOpen,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import {
  MOON_PHASES,
  TASK_CATEGORIES,
  REFERENCE_GUIDE,
  TRADITIONAL_WISDOM,
  PHASE_GUIDANCE,
  PHASE_THEME,
  toISODate,
  fromISODate,
  addDays,
  addMonths,
  startOfMonth,
  formatDayLabel,
  approxMoonPhase,
  type MoonPhase,
} from "./lunar-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ViewMode = "1day" | "7day" | "30day";

interface LunarDay {
  id: string;
  date: string;
  moon_phase: string | null;
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
}

interface TaskForm {
  title: string;
  category: string;
  crop_or_activity: string;
  notes: string;
  status: string;
}

const BLANK_TASK: TaskForm = {
  title: "",
  category: "Planting",
  crop_or_activity: "",
  notes: "",
  status: "planned",
};

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

export default function LunarPlannerPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState<ViewMode>("7day");
  const [anchorISO, setAnchorISO] = useState<string>(() => toISODate(new Date()));

  const [days, setDays] = useState<Record<string, LunarDay>>({});
  const [tasks, setTasks] = useState<LunarTask[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNoteFor, setSavingNoteFor] = useState<string | null>(null);

  const [taskModal, setTaskModal] = useState<{ date: string; taskId?: string } | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(BLANK_TASK);
  const [savingTask, setSavingTask] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [showWisdom, setShowWisdom] = useState(false);

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
    // 30day month view — full calendar month containing the anchor
    const first = startOfMonth(anchor);
    const next = addMonths(first, 1);
    const dates: string[] = [];
    for (let d = new Date(first); d < next; d = addDays(d, 1)) {
      dates.push(toISODate(d));
    }
    return {
      rangeStart: dates[0],
      rangeEnd: dates[dates.length - 1],
      visibleDates: dates,
    };
  }, [view, anchor, anchorISO]);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------
  const loadRange = useCallback(
    async (uid: string, start: string, end: string) => {
      const [dayRes, taskRes] = await Promise.all([
        supabase
          .from("lunar_days")
          .select("id, date, moon_phase, notes")
          .eq("user_id", uid)
          .gte("date", start)
          .lte("date", end),
        supabase
          .from("lunar_tasks")
          .select("id, lunar_day_id, date, title, category, crop_or_activity, notes, status")
          .eq("user_id", uid)
          .gte("date", start)
          .lte("date", end)
          .order("created_at", { ascending: true }),
      ]);
      if (dayRes.error) throw dayRes.error;
      if (taskRes.error) throw taskRes.error;

      const dayMap: Record<string, LunarDay> = {};
      for (const d of (dayRes.data ?? []) as LunarDay[]) dayMap[d.date] = d;
      setDays(dayMap);
      setTasks((taskRes.data ?? []) as LunarTask[]);
    },
    []
  );

  // Resolve the current user once.
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
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

  // Reload whenever the user or the visible range changes.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        await loadRange(userId, rangeStart, rangeEnd);
      } catch (err) {
        if (!cancelled) setError(errMsg(err, "Failed to load planner"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, rangeStart, rangeEnd, loadRange]);

  async function refresh() {
    if (!userId) return;
    try {
      await loadRange(userId, rangeStart, rangeEnd);
    } catch (err) {
      setError(errMsg(err, "Failed to refresh"));
    }
  }

  // -------------------------------------------------------------------------
  // Phase resolution + helpers
  // -------------------------------------------------------------------------
  const resolvedPhase = useCallback(
    (dateISO: string): MoonPhase => {
      const saved = days[dateISO]?.moon_phase;
      if (isMoonPhase(saved)) return saved;
      return approxMoonPhase(fromISODate(dateISO));
    },
    [days]
  );

  const tasksByDate = useMemo(() => {
    const map: Record<string, LunarTask[]> = {};
    for (const t of tasks) {
      (map[t.date] ??= []).push(t);
    }
    return map;
  }, [tasks]);

  // Ensure a lunar_days row exists for a date, returning its id.
  async function ensureDay(dateISO: string, patch?: Partial<LunarDay>): Promise<string> {
    const existing = days[dateISO];
    const payload: Record<string, unknown> = {
      user_id: userId,
      date: dateISO,
      moon_phase: patch?.moon_phase ?? existing?.moon_phase ?? resolvedPhase(dateISO),
      notes: patch?.notes ?? existing?.notes ?? null,
    };
    const { data, error: e } = await supabase
      .from("lunar_days")
      .upsert(payload, { onConflict: "user_id,date" })
      .select("id, date, moon_phase, notes")
      .single();
    if (e) throw e;
    const row = data as LunarDay;
    setDays((prev) => ({ ...prev, [dateISO]: row }));
    return row.id;
  }

  async function handleChangePhase(dateISO: string, phase: MoonPhase) {
    try {
      setError("");
      await ensureDay(dateISO, { moon_phase: phase });
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
    setTaskForm(BLANK_TASK);
    setTaskModal({ date: dateISO });
  }

  function openEditTask(task: LunarTask) {
    setTaskForm({
      title: task.title,
      category: task.category ?? "Other",
      crop_or_activity: task.crop_or_activity ?? "",
      notes: task.notes ?? "",
      status: task.status ?? "planned",
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
    try {
      setSavingTask(true);
      setError("");
      const payload = {
        title,
        category: taskForm.category || null,
        crop_or_activity: taskForm.crop_or_activity.trim() || null,
        notes: taskForm.notes.trim() || null,
        status: taskForm.status || "planned",
      };
      if (taskModal.taskId) {
        const { error: e } = await supabase
          .from("lunar_tasks")
          .update(payload)
          .eq("id", taskModal.taskId);
        if (e) throw e;
      } else {
        const dayId = await ensureDay(taskModal.date);
        const { error: e } = await supabase.from("lunar_tasks").insert({
          ...payload,
          user_id: userId,
          lunar_day_id: dayId,
          date: taskModal.date,
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

  async function handleToggleDone(task: LunarTask) {
    try {
      setBusyTaskId(task.id);
      setError("");
      const next = task.status === "done" ? "planned" : "done";
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

  async function handleDeleteTask(task: LunarTask) {
    try {
      setBusyTaskId(task.id);
      setError("");
      const { error: e } = await supabase.from("lunar_tasks").delete().eq("id", task.id);
      if (e) throw e;
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setError(errMsg(err, "Failed to delete task"));
    } finally {
      setBusyTaskId(null);
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

  // Heading describing the current period.
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
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Online
              </p>
              <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight">
                <Moon className="h-7 w-7 text-indigo-500" />
                Lunar Farming Planner
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Plan farm tasks by the rhythm of the moon.
              </p>
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

        {/* 1. Lunar Farming Guide — permanent reference */}
        <section className="mb-6 rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-indigo-900">
            <BookOpen className="h-5 w-5" />
            Lunar Farming Guide
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REFERENCE_GUIDE.map(({ phase, summary }) => {
              const theme = PHASE_THEME[phase];
              return (
                <div
                  key={phase}
                  className={`rounded-2xl border ${theme.ring} bg-white/80 p-4`}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />
                    <span className="font-semibold">{phase}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-600">{summary}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. Traditional Lunar Farming Wisdom */}
        <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
          <button
            onClick={() => setShowWisdom((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-900">
              <ScrollText className="h-5 w-5" />
              Traditional Lunar Farming Wisdom
            </h2>
            <span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800">
              {showWisdom ? "Hide" : "Show"} 10 tips
            </span>
          </button>
          {showWisdom && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TRADITIONAL_WISDOM.map((w, i) => (
                <div
                  key={w.title}
                  className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"
                >
                  <h3 className="mb-2 font-semibold text-zinc-800">
                    {i + 1}. {w.title}
                  </h3>
                  <ul className="space-y-1 text-sm leading-relaxed text-zinc-600">
                    {w.lines.map((line, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* 3 + 8. View switch & navigation */}
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
                  view === mode
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
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
            anchor={anchor}
            todayISO={todayISO}
            resolvedPhase={resolvedPhase}
            tasksByDate={tasksByDate}
            onOpenDay={(d) => {
              setAnchorISO(d);
              setView("1day");
            }}
            onAddTask={openAddTask}
          />
        ) : (
          <div
            className={
              view === "7day"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid grid-cols-1 gap-4"
            }
          >
            {visibleDates.map((dateISO) => (
              <DayCard
                key={dateISO}
                dateISO={dateISO}
                large={view === "1day"}
                isToday={dateISO === todayISO}
                phase={resolvedPhase(dateISO)}
                savedPhase={days[dateISO]?.moon_phase ?? null}
                tasks={tasksByDate[dateISO] ?? []}
                noteValue={noteDrafts[dateISO] ?? days[dateISO]?.notes ?? ""}
                savingNote={savingNoteFor === dateISO}
                busyTaskId={busyTaskId}
                onChangePhase={(p) => handleChangePhase(dateISO, p)}
                onNoteChange={(v) =>
                  setNoteDrafts((prev) => ({ ...prev, [dateISO]: v }))
                }
                onNoteBlur={() => handleSaveNotes(dateISO)}
                onAddTask={() => openAddTask(dateISO)}
                onEditTask={openEditTask}
                onToggleDone={handleToggleDone}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>
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
              {formatDayLabel(fromISODate(taskModal.date), { weekday: true, year: true })}
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                    Category
                  </label>
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
                  onChange={(e) =>
                    setTaskForm((p) => ({ ...p, crop_or_activity: e.target.value }))
                  }
                  placeholder="Ginger, turmeric…"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Notes</label>
                <textarea
                  className="min-h-[70px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))}
                />
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
    </main>
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
  savedPhase: string | null;
  tasks: LunarTask[];
  noteValue: string;
  savingNote: boolean;
  busyTaskId: string | null;
  onChangePhase: (p: MoonPhase) => void;
  onNoteChange: (v: string) => void;
  onNoteBlur: () => void;
  onAddTask: () => void;
  onEditTask: (t: LunarTask) => void;
  onToggleDone: (t: LunarTask) => void;
  onDeleteTask: (t: LunarTask) => void;
}

function DayCard(props: DayCardProps) {
  const {
    dateISO,
    large,
    isToday,
    phase,
    savedPhase,
    tasks,
    noteValue,
    savingNote,
    busyTaskId,
    onChangePhase,
    onNoteChange,
    onNoteBlur,
    onAddTask,
    onEditTask,
    onToggleDone,
    onDeleteTask,
  } = props;
  const theme = PHASE_THEME[phase];
  const date = fromISODate(dateISO);
  const guidance = PHASE_GUIDANCE[phase];

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
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}
        >
          <Moon className="h-3.5 w-3.5" />
          {phase}
        </span>
      </div>

      {/* Manual moon phase entry */}
      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          Moon phase {savedPhase ? "" : "(auto)"}
        </label>
        <select
          value={phase}
          onChange={(e) => onChangePhase(e.target.value as MoonPhase)}
          className="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-900"
        >
          {MOON_PHASES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

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
                  className={`group flex items-start gap-2 rounded-xl border px-2.5 py-2 text-sm transition ${
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
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span
                        className={`truncate font-medium ${
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
                    </div>
                    {t.notes && (
                      <p className="mt-1 text-[11px] leading-snug text-zinc-500">{t.notes}</p>
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

      {/* Notes */}
      <div className="mb-3">
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

      {/* Daily lunar guidance */}
      <div className={`mt-auto rounded-2xl ${theme.chip} px-3 py-2.5`}>
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
          <Moon className="h-3.5 w-3.5" /> Traditional guidance
        </p>
        <ul className="space-y-0.5 text-xs leading-snug">
          {guidance.map((g, i) => (
            <li key={i} className="flex gap-1.5">
              <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${theme.dot}`} />
              <span>{g}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month grid (30-day compact view)
// ---------------------------------------------------------------------------
interface MonthGridProps {
  dates: string[];
  anchor: Date;
  todayISO: string;
  resolvedPhase: (d: string) => MoonPhase;
  tasksByDate: Record<string, LunarTask[]>;
  onOpenDay: (d: string) => void;
  onAddTask: (d: string) => void;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function MonthGrid(props: MonthGridProps) {
  const { dates, todayISO, resolvedPhase, tasksByDate, onOpenDay, onAddTask } = props;
  // Leading blanks so the first day lands under the right weekday (Mon-start).
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
          <div key={`blank-${i}`} className="min-h-[64px]" />
        ))}
        {dates.map((dateISO) => {
          const date = fromISODate(dateISO);
          const phase = resolvedPhase(dateISO);
          const theme = PHASE_THEME[phase];
          const dayTasks = tasksByDate[dateISO] ?? [];
          const doneCount = dayTasks.filter((t) => t.status === "done").length;
          const isToday = dateISO === todayISO;
          return (
            <div
              key={dateISO}
              className={`group relative flex min-h-[64px] flex-col rounded-xl border p-1.5 transition sm:min-h-[88px] sm:p-2 ${
                isToday ? "border-emerald-400 ring-1 ring-emerald-200" : theme.ring
              } bg-white hover:shadow-sm`}
            >
              <button
                onClick={() => onOpenDay(dateISO)}
                className="flex items-center justify-between text-left"
                title={`${phase} — open day`}
              >
                <span
                  className={`text-xs font-semibold sm:text-sm ${
                    isToday ? "text-emerald-700" : "text-zinc-700"
                  }`}
                >
                  {date.getDate()}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${theme.dot}`}
                  title={phase}
                />
              </button>
              <button
                onClick={() => onOpenDay(dateISO)}
                className="mt-1 flex-1 space-y-0.5 overflow-hidden text-left"
              >
                {dayTasks.slice(0, 2).map((t) => (
                  <p
                    key={t.id}
                    className={`truncate rounded px-1 text-[10px] leading-tight sm:text-[11px] ${
                      t.status === "done"
                        ? "text-zinc-300 line-through"
                        : `${theme.chip}`
                    }`}
                  >
                    {t.title}
                  </p>
                ))}
                {dayTasks.length > 2 && (
                  <p className="px-1 text-[10px] text-zinc-400">
                    +{dayTasks.length - 2} more
                  </p>
                )}
              </button>
              <div className="mt-1 flex items-center justify-between">
                {dayTasks.length > 0 ? (
                  <span className="text-[9px] font-medium text-zinc-400 sm:text-[10px]">
                    {doneCount}/{dayTasks.length}
                  </span>
                ) : (
                  <span />
                )}
                <button
                  onClick={() => onAddTask(dateISO)}
                  aria-label="Add task"
                  className="rounded-md p-0.5 text-zinc-300 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100"
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
