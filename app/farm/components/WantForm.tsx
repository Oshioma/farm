"use client";

import { useState } from "react";

export type WantFormData = {
  name: string;
  price: string;
  notes: string;
};

const blank: WantFormData = {
  name: "",
  price: "",
  notes: "",
};

type Props = {
  onSubmit: (data: WantFormData) => Promise<boolean>;
  initial?: WantFormData;
  submitLabel?: string;
};

export function WantForm({ onSubmit, initial, submitLabel }: Props) {
  const [form, setForm] = useState<WantFormData>(initial ?? blank);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok && !initial) setForm(blank);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          placeholder="e.g. Drip irrigation kit"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Price (TZS)</label>
        <input
          type="number"
          step="1"
          min="0"
          value={form.price}
          onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
          className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          placeholder="Leave blank if unknown"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Notes</label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          placeholder="Supplier, model, why we want it…"
        />
      </div>

      <button
        type="submit"
        disabled={saving || !form.name.trim()}
        className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : (submitLabel ?? "Add want")}
      </button>
    </form>
  );
}
