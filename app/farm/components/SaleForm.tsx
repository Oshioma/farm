"use client";

import { useState, useEffect } from "react";
import type { Crop } from "@/lib/farm";

export type SaleFormData = {
  crop_id: string;
  buyer_name: string;
  quantity_kg: string;
  price_per_kg: string;
  total_amount: string;
  sale_date: string;
  notes: string;
};

const blank: SaleFormData = {
  crop_id: "",
  buyer_name: "",
  quantity_kg: "",
  price_per_kg: "",
  total_amount: "",
  sale_date: "",
  notes: "",
};

type Props = {
  crops: Crop[];
  onSubmit: (data: SaleFormData) => Promise<boolean>;
  initial?: SaleFormData;
  submitLabel?: string;
};

export function SaleForm({ crops, onSubmit, initial, submitLabel }: Props) {
  const [form, setForm] = useState<SaleFormData>(initial ?? blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  function updateField(field: keyof SaleFormData, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "quantity_kg" || field === "price_per_kg") {
        const qty = Number(field === "quantity_kg" ? value : next.quantity_kg);
        const price = Number(field === "price_per_kg" ? value : next.price_per_kg);
        if (qty > 0 && price > 0) {
          next.total_amount = String(Math.round(qty * price));
        }
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok && !initial) setForm(blank);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Crop</label>
          <select
            value={form.crop_id}
            onChange={(e) => updateField("crop_id", e.target.value)}
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
          <label className="mb-2 block text-sm font-medium">Buyer name</label>
          <input
            type="text"
            value={form.buyer_name}
            onChange={(e) => updateField("buyer_name", e.target.value)}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="e.g. Market vendor"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium">Quantity (kg)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.quantity_kg}
            onChange={(e) => updateField("quantity_kg", e.target.value)}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="0"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Price per kg (TZS)</label>
          <input
            type="number"
            step="1"
            min="0"
            value={form.price_per_kg}
            onChange={(e) => updateField("price_per_kg", e.target.value)}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="0"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Total (TZS)</label>
          <input
            type="number"
            step="1"
            min="0"
            value={form.total_amount}
            onChange={(e) => updateField("total_amount", e.target.value)}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Auto-calculated"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Sale date</label>
        <input
          type="date"
          value={form.sale_date}
          onChange={(e) => updateField("sale_date", e.target.value)}
          className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Notes</label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          placeholder="Any details about the sale"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : (submitLabel ?? "Log sale")}
      </button>
    </form>
  );
}
