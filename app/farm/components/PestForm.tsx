"use client";

import { useState, useEffect } from "react";
import type { Zone, Crop } from "@/lib/farm";

export type PestFormData = {
  pest_name: string;
  severity: string;
  description: string;
  action_taken: string;
  logged_date: string;
  crop_id: string;
  zone_id: string;
};

const blank: PestFormData = {
  pest_name: "",
  severity: "medium",
  description: "",
  action_taken: "",
  logged_date: "",
  crop_id: "",
  zone_id: "",
};

type Props = {
  zones: Zone[];
  crops: Crop[];
  defaultZoneId: string;
  onSubmit: (data: PestFormData) => Promise<boolean>;
};

export function PestForm({ zones, crops, defaultZoneId, onSubmit }: Props) {
  const [form, setForm] = useState<PestFormData>(blank);
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
    if (ok) setForm({ ...blank, zone_id: defaultZoneId });
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Log pest issue</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Record what you saw, where, and what you did about it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Pest / issue</label>
          <input
            type="text"
            value={form.pest_name}
            onChange={(e) => setForm((prev) => ({ ...prev, pest_name: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Aphids, whitefly, fungal blight…"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Severity</label>
            <select
              value={form.severity}
              onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Date spotted</label>
            <input
              type="date"
              value={form.logged_date}
              onChange={(e) => setForm((prev) => ({ ...prev, logged_date: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Crop</label>
            <select
              value={form.crop_id}
              onChange={(e) => setForm((prev) => ({ ...prev, crop_id: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            >
              <option value="">No specific crop</option>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.crop_name}{crop.variety ? ` · ${crop.variety}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Zone</label>
            <select
              value={form.zone_id}
              onChange={(e) => setForm((prev) => ({ ...prev, zone_id: e.target.value }))}
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
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">What you saw</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="min-h-[80px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Yellowing leaves on lower stems, clusters on underside…"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Action taken</label>
          <textarea
            value={form.action_taken}
            onChange={(e) => setForm((prev) => ({ ...prev, action_taken: e.target.value }))}
            className="min-h-[80px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Sprayed neem oil, removed affected leaves…"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !form.pest_name.trim()}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Logging…" : "Log pest issue"}
        </button>
      </form>
    </div>
  );
}
