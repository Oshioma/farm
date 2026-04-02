"use client";

import { useState, useEffect } from "react";
import type { Zone, Crop } from "@/lib/farm";

export type ExpenseFormData = {
  category: string;
  amount: string;
  expense_date: string;
  crop_id: string;
  zone_id: string;
};

const blank: ExpenseFormData = {
  category: "labor",
  amount: "",
  expense_date: "",
  crop_id: "",
  zone_id: "",
};

const CATEGORIES = [
  "labor",
  "seeds",
  "fertilizer",
  "pesticide",
  "equipment",
  "water",
  "transport",
  "other",
];

type Props = {
  zones: Zone[];
  crops: Crop[];
  defaultZoneId: string;
  onSubmit: (data: ExpenseFormData) => Promise<boolean>;
};

export function ExpenseForm({ zones, crops, defaultZoneId, onSubmit }: Props) {
  const [form, setForm] = useState<ExpenseFormData>(blank);
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
        <h2 className="text-xl font-semibold">Log expense</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Record what was spent and link it to a crop or zone.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Amount (TZS)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
              placeholder="15000"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Date</label>
          <input
            type="date"
            value={form.expense_date}
            onChange={(e) => setForm((prev) => ({ ...prev, expense_date: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Crop</label>
          <select
            value={form.crop_id}
            onChange={(e) => setForm((prev) => ({ ...prev, crop_id: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          >
            <option value="">Not linked to a crop</option>
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.crop_name}
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

        <button
          type="submit"
          disabled={saving || !form.amount}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Logging expense..." : "Log expense"}
        </button>
      </form>
    </div>
  );
}
