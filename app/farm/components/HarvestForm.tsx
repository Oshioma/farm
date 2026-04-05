"use client";

import { useState, useEffect } from "react";
import type { Zone, Crop } from "@/lib/farm";

export type HarvestFormData = {
  crop_id: string;
  zone_id: string;
  harvest_date: string;
  quantity_kg: string;
  quality: string;
  notes: string;
};

const blank: HarvestFormData = {
  crop_id: "",
  zone_id: "",
  harvest_date: "",
  quantity_kg: "",
  quality: "standard",
  notes: "",
};

type Props = {
  zones: Zone[];
  crops: Crop[];
  defaultCropId: string;
  defaultZoneId: string;
  onSubmit: (data: HarvestFormData) => Promise<boolean>;
};

export function HarvestForm({ zones, crops, defaultCropId, defaultZoneId, onSubmit }: Props) {
  const [form, setForm] = useState<HarvestFormData>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaultCropId) {
      setForm((prev) =>
        prev.crop_id
          ? prev
          : { ...prev, crop_id: defaultCropId, zone_id: defaultZoneId }
      );
    }
  }, [defaultCropId, defaultZoneId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) setForm(blank);
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Log harvest</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Record actual yield and push the crop into real production data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Crop</label>
          <select
            value={form.crop_id}
            onChange={(e) => {
              const selected = crops.find((c) => c.id === e.target.value) ?? null;
              setForm((prev) => ({
                ...prev,
                crop_id: e.target.value,
                zone_id: selected?.zone_id ?? "",
              }));
            }}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            required
          >
            <option value="">Select crop</option>
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name}
                {crop.variety ? ` · ${crop.variety}` : ""}
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

        <div>
          <label className="mb-2 block text-sm font-medium">Harvest date</label>
          <input
            type="date"
            value={form.harvest_date}
            onChange={(e) => setForm((prev) => ({ ...prev, harvest_date: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Quantity (kg)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.quantity_kg}
            onChange={(e) => setForm((prev) => ({ ...prev, quantity_kg: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="120"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Quality</label>
          <select
            value={form.quality}
            onChange={(e) => setForm((prev) => ({ ...prev, quality: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          >
            <option value="premium">premium</option>
            <option value="standard">standard</option>
            <option value="lower_grade">lower_grade</option>
            <option value="mixed">mixed</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="min-h-[100px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Any notes on quality, weather, or batch."
          />
        </div>

        <button
          type="submit"
          disabled={saving || !form.crop_id}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Logging harvest..." : "Log harvest"}
        </button>
      </form>
    </div>
  );
}
