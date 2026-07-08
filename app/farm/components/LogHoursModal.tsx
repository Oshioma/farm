"use client";

import { useState } from "react";
import { WORKERS } from "@/lib/workers";

type Props = {
  taskTitle: string;
  defaultWorkerName: string;
  saving: boolean;
  onConfirm: (data: { hours: number; workerName: string; notes: string }) => void;
  onSkip: () => void;
  onClose: () => void;
};

const inp = "w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

export function LogHoursModal({ taskTitle, defaultWorkerName, saving, onConfirm, onSkip, onClose }: Props) {
  const [hoursStr, setHoursStr] = useState("");
  const [minutesStr, setMinutesStr] = useState("");
  const [workerName, setWorkerName] = useState(defaultWorkerName);
  const [notes, setNotes] = useState(taskTitle);

  const totalHours = (parseFloat(hoursStr) || 0) + (parseFloat(minutesStr) || 0) / 60;
  const canLog = totalHours > 0 && workerName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Log time for this goal?</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Add how long &ldquo;{taskTitle}&rdquo; took and it&rsquo;ll be added to the work hours log.
        </p>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">Hours</label>
              <input
                type="number"
                min="0"
                step="1"
                className={inp}
                value={hoursStr}
                onChange={(e) => setHoursStr(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">Minutes</label>
              <input
                type="number"
                min="0"
                max="59"
                step="1"
                className={inp}
                value={minutesStr}
                onChange={(e) => setMinutesStr(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">Worker</label>
            <input
              className={inp}
              list="log-hours-workers"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              placeholder="Name"
            />
            <datalist id="log-hours-workers">
              {WORKERS.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">Notes</label>
            <textarea
              className={`${inp} min-h-[60px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => onConfirm({ hours: totalHours, workerName: workerName.trim(), notes: notes.trim() })}
            disabled={saving || !canLog}
            className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Log & complete"}
          </button>
          <button
            onClick={onSkip}
            disabled={saving}
            className="rounded-2xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
          >
            Skip
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="ml-auto rounded-2xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:text-zinc-700 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
