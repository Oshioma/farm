"use client";

import { useState, useEffect } from "react";
import type { Zone, Crop, FarmMember, GoalTimeframe } from "@/lib/farm";

export type TaskFormData = {
  title: string;
  description: string;
  zone_id: string;
  crop_id: string;
  assigned_to: string;
  status: string;
  priority: string;
  due_date: string;
  proof_required: boolean;
  goal_timeframe: GoalTimeframe;
};

const blank: TaskFormData = {
  title: "",
  description: "",
  zone_id: "",
  crop_id: "",
  assigned_to: "",
  status: "todo",
  priority: "medium",
  due_date: "",
  proof_required: false,
  goal_timeframe: "month",
};

type Props = {
  zones: Zone[];
  crops: Crop[];
  members: FarmMember[];
  defaultZoneId: string;
  defaultTimeframe?: GoalTimeframe;
  onSubmit: (data: TaskFormData) => Promise<boolean>;
  // Edit mode: prefill the form, relabel it, and keep the values after a
  // successful save instead of clearing (the parent closes the editor).
  initial?: TaskFormData;
  heading?: string;
  subheading?: string;
  submitLabel?: string;
  savingLabel?: string;
  resetOnSuccess?: boolean;
};

function yearOf(dueDate: string, fallback: number): number {
  const y = dueDate ? parseInt(dueDate.slice(0, 4), 10) : NaN;
  return Number.isFinite(y) ? y : fallback;
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 9 }, (_, i) => currentYear - 1 + i);

export function TaskForm({
  zones,
  crops,
  members,
  defaultZoneId,
  defaultTimeframe,
  onSubmit,
  initial,
  heading = "Create goal",
  subheading = "Add what needs doing and link it to a crop if relevant.",
  submitLabel = "Create goal",
  savingLabel = "Creating goal...",
  resetOnSuccess = true,
}: Props) {
  const [form, setForm] = useState<TaskFormData>(
    initial ?? { ...blank, goal_timeframe: defaultTimeframe ?? "month" }
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaultZoneId) {
      setForm((prev) => (prev.zone_id ? prev : { ...prev, zone_id: defaultZoneId }));
    }
  }, [defaultZoneId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok && resetOnSuccess) {
      setForm({ ...blank, zone_id: defaultZoneId, goal_timeframe: defaultTimeframe ?? "month" });
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">{heading}</h2>
        <p className="mt-1 text-sm text-zinc-500">{subheading}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Goal title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Stake tomato rows"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Timeframe</label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { key: "month", label: "Month" },
                { key: "year", label: "Year" },
                { key: "3year", label: "3-Year" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, goal_timeframe: key }))}
                className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                  form.goal_timeframe === key
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="min-h-[110px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Support tomatoes before the next growth push."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Bed</label>
          <select
            value={form.zone_id}
            onChange={(e) => setForm((prev) => ({ ...prev, zone_id: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          >
            <option value="">No bed</option>
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
            value={form.crop_id}
            onChange={(e) => setForm((prev) => ({ ...prev, crop_id: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          >
            <option value="">General goal</option>
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.crop_name}
                {crop.variety ? ` · ${crop.variety}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Assign to</label>
          <select
            value={form.assigned_to}
            onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          >
            <option value="">Unassigned (general task)</option>
            {members.map((m) => (
              <option key={m.profile_id} value={m.profile_id}>
                {m.user_email ?? m.profile_id}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
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
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="urgent">urgent</option>
            </select>
          </div>
        </div>

        {form.goal_timeframe === "month" ? (
          <div>
            <label className="mb-2 block text-sm font-medium">Due date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            />
          </div>
        ) : form.goal_timeframe === "year" ? (
          <div>
            <label className="mb-2 block text-sm font-medium">Target year</label>
            <select
              value={yearOf(form.due_date, currentYear)}
              onChange={(e) => setForm((prev) => ({ ...prev, due_date: `${e.target.value}-01-01` }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-medium">3-year window</label>
            <select
              value={yearOf(form.due_date, currentYear)}
              onChange={(e) => setForm((prev) => ({ ...prev, due_date: `${e.target.value}-01-01` }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y} – {y + 2}</option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-3 rounded-2xl border border-zinc-300 px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={form.proof_required}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, proof_required: e.target.checked }))
            }
          />
          Photo proof required
        </label>

        <button
          type="submit"
          disabled={saving || !form.title.trim()}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? savingLabel : submitLabel}
        </button>
      </form>
    </div>
  );
}
