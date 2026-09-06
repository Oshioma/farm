"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";

export type ZoneFormData = {
  name: string;
  code: string;
  size_acres: string;
};

const blank: ZoneFormData = { name: "", code: "", size_acres: "" };

type Props = {
  onSubmit: (data: ZoneFormData) => Promise<boolean>;
};

export function ZoneForm({ onSubmit }: Props) {
  const t = useT();
  const [form, setForm] = useState<ZoneFormData>(blank);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Auto-generate code from name
    const code = form.name.trim().toUpperCase().replace(/\s+/g, "");
    setSaving(true);
    const ok = await onSubmit({ ...form, code });
    setSaving(false);
    if (ok) setForm(blank);
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">{t("Add zone")}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {t("Name a planting area — Bed 1, Greenhouse A, North Field, etc.")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">{t("Zone name")}</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder={t("Bed 1, Greenhouse A, North Field…")}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            {t("Size (acres)")} <span className="font-normal text-zinc-400">{t("(optional)")}</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.size_acres}
            onChange={(e) => setForm((prev) => ({ ...prev, size_acres: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="0.25"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t("Adding zone…") : t("Add zone")}
        </button>
      </form>
    </div>
  );
}
