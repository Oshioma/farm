"use client";

import { useState, useEffect, useId } from "react";
import type { Zone, Crop } from "@/lib/farm";
import { useT } from "@/lib/i18n";
import { useFormDraft } from "@/hooks/useFormDraft";

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
  /* Where to keep the unsaved draft, e.g. "expense-new:<farmId>". */
  draftKey?: string;
  /* Names already used in Paid by, offered so spellings stay consistent. */
  payerSuggestions?: string[];
};

export function ExpenseForm({ zones, crops, defaultZoneId, onSubmit, initial, submitLabel, draftKey, payerSuggestions = [] }: Props) {
  const t = useT();
  const baseline = initial ?? { ...blank, zone_id: defaultZoneId };
  const [form, setForm, clearDraft] = useFormDraft<ExpenseFormData>(draftKey ?? null, baseline);
  const [saving, setSaving] = useState(false);
  const payerListId = useId();

  /* Beds load after the form can mount: pick the default bed once known,
     unless one is already chosen (or restored from a draft). */
  useEffect(() => {
    if (initial || !defaultZoneId) return;
    setForm((prev) => (prev.zone_id ? prev : { ...prev, zone_id: defaultZoneId }));
  }, [initial, defaultZoneId, setForm]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) {
      clearDraft();
      if (!initial) setForm({ ...blank, zone_id: defaultZoneId });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">{t("Category")}</label>
          <select
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(c)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">{t("Amount (TZS)")}</label>
          <input
            type="number"
            step="1"
            min="0"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder={t("Leave blank if unknown")}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">{t("Date")}</label>
          <input
            type="date"
            value={form.expense_date}
            onChange={(e) => setForm((prev) => ({ ...prev, expense_date: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">{t("Paid by")}</label>
          <input
            type="text"
            value={form.vendor_name}
            onChange={(e) => setForm((prev) => ({ ...prev, vendor_name: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder={t("e.g. EH")}
            list={payerSuggestions.length > 0 ? payerListId : undefined}
          />
          {payerSuggestions.length > 0 && (
            <datalist id={payerListId}>
              {payerSuggestions.map((name) => <option key={name} value={name} />)}
            </datalist>
          )}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">{t("Notes")}</label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          placeholder={t("What was purchased?")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">{t("Crop")}</label>
          <select
            value={form.crop_id}
            onChange={(e) => setForm((prev) => ({ ...prev, crop_id: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          >
            <option value="">{t("Not linked to a crop")}</option>
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.crop_name}
                {crop.variety ? ` · ${crop.variety}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">{t("Bed")}</label>
          <select
            value={form.zone_id}
            onChange={(e) => setForm((prev) => ({ ...prev, zone_id: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
          >
            <option value="">{t("No bed")}</option>
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
        {saving ? t("Saving...") : t(submitLabel ?? "Log expense")}
      </button>
    </form>
  );
}
