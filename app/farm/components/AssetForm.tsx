"use client";

import { useState } from "react";

export type AssetFormData = {
  name: string;
  category: string;
  purchase_date: string;
  purchase_price: string;
  paid_by: string;
  condition: string;
  notes: string;
};

const blank: AssetFormData = {
  name: "",
  category: "equipment",
  purchase_date: "",
  purchase_price: "",
  paid_by: "",
  condition: "good",
  notes: "",
};

const CATEGORIES = [
  "equipment",
  "vehicle",
  "tool",
  "infrastructure",
  "livestock",
  "other",
];

const CONDITIONS = ["new", "good", "fair", "poor"];

type Props = {
  onSubmit: (data: AssetFormData) => Promise<boolean>;
};

export function AssetForm({ onSubmit }: Props) {
  const [form, setForm] = useState<AssetFormData>(blank);
  const [saving, setSaving] = useState(false);

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
        <h2 className="text-xl font-semibold">Log asset</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Record equipment or infrastructure and who paid for it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Water pump"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => setForm((prev) => ({ ...prev, condition: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Purchase date</label>
            <input
              type="date"
              value={form.purchase_date}
              onChange={(e) => setForm((prev) => ({ ...prev, purchase_date: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Purchase price (TZS)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={form.purchase_price}
              onChange={(e) => setForm((prev) => ({ ...prev, purchase_price: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
              placeholder="450000"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Paid by</label>
          <input
            type="text"
            value={form.paid_by}
            onChange={(e) => setForm((prev) => ({ ...prev, paid_by: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Partner name or Farm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Notes</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Serial number, supplier, etc."
          />
        </div>

        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving asset..." : "Save asset"}
        </button>
      </form>
    </div>
  );
}
