"use client";

import { useState, useEffect } from "react";
import type { Zone } from "@/lib/farm";

export type CropFormData = {
  crop_name: string;
  variety: string;
  zone_id: string;
  status: string;
  planted_on: string;
  expected_harvest_start: string;
  estimated_yield_kg: string;
  expected_sale_price_per_kg: string;
};

const blank: CropFormData = {
  crop_name: "",
  variety: "",
  zone_id: "",
  status: "planned",
  planted_on: "",
  expected_harvest_start: "",
  estimated_yield_kg: "",
  expected_sale_price_per_kg: "",
};

type Props = {
  zones: Zone[];
  defaultZoneId: string;
  onSubmit: (data: CropFormData) => Promise<boolean>;
};

export function CropForm({ zones, defaultZoneId, onSubmit }: Props) {
  const [form, setForm] = useState<CropFormData>(blank);
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
        <h2 className="text-xl font-semibold">Create crop</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Add the crop cycle and link it to a zone.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Crop name</label>
          <input
            type="text"
            value={form.crop_name}
            onChange={(e) => setForm((prev) => ({ ...prev, crop_name: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Tomatoes"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Variety</label>
          <input
            type="text"
            value={form.variety}
            onChange={(e) => setForm((prev) => ({ ...prev, variety: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Roma"
          />
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
          <label className="mb-2 block text-sm font-medium">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          >
            <option value="planned">planned</option>
            <option value="planted">planted</option>
            <option value="germinating">germinating</option>
            <option value="growing">growing</option>
            <option value="harvest_ready">harvest_ready</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Planted on</label>
          <input
            type="date"
            value={form.planted_on}
            onChange={(e) => setForm((prev) => ({ ...prev, planted_on: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Expected harvest</label>
          <input
            type="date"
            value={form.expected_harvest_start}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, expected_harvest_start: e.target.value }))
            }
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Estimated yield (kg)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.estimated_yield_kg}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, estimated_yield_kg: e.target.value }))
            }
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Expected price per kg</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.expected_sale_price_per_kg}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, expected_sale_price_per_kg: e.target.value }))
            }
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="3000"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !form.crop_name.trim()}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Creating crop..." : "Create crop"}
        </button>
      </form>
    </div>
  );
}
