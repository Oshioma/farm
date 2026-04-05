"use client";

import { useState, useEffect, useRef } from "react";
import type { Zone } from "@/lib/farm";

export type CropFormData = {
  name: string;
  variety: string;
  zone_id: string;
  status: string;
  planted_on: string;
  expected_harvest_start: string;
  estimated_yield_kg: string;
  expected_sale_price_per_kg: string;
  notes: string;
  medicinal_properties: string;
  image_file: File | null;
};

const blank: CropFormData = {
  name: "",
  variety: "",
  zone_id: "",
  status: "planned",
  planted_on: "",
  expected_harvest_start: "",
  estimated_yield_kg: "",
  expected_sale_price_per_kg: "",
  notes: "",
  medicinal_properties: "",
  image_file: null,
};

type Props = {
  zones: Zone[];
  defaultZoneId: string;
  onSubmit: (data: CropFormData) => Promise<boolean>;
};

export function CropForm({ zones, defaultZoneId, onSubmit }: Props) {
  const [form, setForm] = useState<CropFormData>(blank);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultZoneId) {
      setForm((prev) => (prev.zone_id ? prev : { ...prev, zone_id: defaultZoneId }));
    }
  }, [defaultZoneId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, image_file: f }));
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) {
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview("");
      setForm({ ...blank, zone_id: defaultZoneId });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
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
          <label className="mb-2 block text-sm font-medium">
            Photo <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-sm text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-200"
          />
        </div>

        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="h-48 w-full rounded-2xl object-cover"
          />
        ) : null}

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

        <div>
          <label className="mb-2 block text-sm font-medium">
            Notes <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="min-h-[80px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Growing conditions, observations…"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Medicinal properties <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <textarea
            value={form.medicinal_properties}
            onChange={(e) => setForm((prev) => ({ ...prev, medicinal_properties: e.target.value }))}
            className="min-h-[60px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Traditional or known medicinal uses…"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Creating crop..." : "Create crop"}
        </button>
      </form>
    </div>
  );
}
