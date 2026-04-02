"use client";

import { useState, useEffect } from "react";
import type { Zone, Crop } from "@/lib/farm";

export type ExpenseFormData = {
  category: string;
  amount: string;
  expense_date: string;
  crop_id: string;
  zone_id: string;
  notes: string;
  vendor_name: string;
};

const blank: ExpenseFormData = {
  category: "other",
  amount: "",
  expense_date: "",
  crop_id: "",
  zone_id: "",
  notes: "",
  vendor_name: "",
};

const CATEGORIES = [
  "seeds",
  "fertilizer",
  "compost",
  "pesticide",
  "labour",
  "transport",
  "fuel",
  "equipment",
  "irrigation",
  "packaging",
  "maintenance",
  "rent",
  "utilities",
  "other",
];

type Props = {
  zones: Zone[];
  crops: Crop[];
  defaultZoneId: string;
  onSubmit: (data: ExpenseFormData) => Promise<boolean>;
  initial?: ExpenseFormData;
  submitLabel?: string;
};

export function ExpenseForm({ zones, crops, defaultZoneId, onSubmit, initial, submitLabel }: Props) {
  const [form, setForm] = useState<ExpenseFormData>(initial ?? blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm(initial);
    } else if (defaultZoneId) {
      setForm((prev) => (prev.zone_id ? prev : { ...prev, zone_id: defaultZoneId }));
    }
  }, [initial, defaultZoneId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok && !initial) setForm({ ...blank, zone_id: defaultZoneId });
  }

  return (
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
            placeholder="Leave blank if unknown"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
          <label className="mb-2 block text-sm font-medium">Paid by</label>
          <input
            type="text"
            value={form.vendor_name}
            onChange={(e) => setForm((prev) => ({ ...prev, vendor_name: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="e.g. Eh"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Notes</label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          placeholder="What was purchased?"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : (submitLabel ?? "Log expense")}
      </button>
    </form>
  );
}
