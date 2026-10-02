"use client";

import { useId, useState } from "react";
import { useT } from "@/lib/i18n";
import { useFormDraft } from "@/hooks/useFormDraft";

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
  initial?: AssetFormData;
  submitLabel?: string;
  /* Where to keep the unsaved draft, e.g. "asset-new:<farmId>". */
  draftKey?: string;
  /* Names already used in Paid by, offered so spellings stay consistent. */
  payerSuggestions?: string[];
  /* Drop the card and heading when the form sits inside another card. */
  bare?: boolean;
};

export function AssetForm({ onSubmit, initial, submitLabel, draftKey, payerSuggestions = [], bare = false }: Props) {
  const t = useT();
  const [form, setForm, clearDraft] = useFormDraft<AssetFormData>(draftKey ?? null, initial ?? blank);
  const [saving, setSaving] = useState(false);
  const payerListId = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) {
      clearDraft();
      if (!initial) setForm(blank);
    }
  }

  return (
    <div className={bare ? "" : "rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"}>
      {!bare && (
        <div className="mb-5">
          <h2 className="text-xl font-semibold">{t("Log asset")}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {t("Record equipment or infrastructure and who paid for it.")}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">{t("Name")}</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder={t("Water pump")}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">{t("Category")}</label>
            <select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(c)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{t("Condition")}</label>
            <select
              value={form.condition}
              onChange={(e) => setForm((prev) => ({ ...prev, condition: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{t(c)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">{t("Purchase date")}</label>
            <input
              type="date"
              value={form.purchase_date}
              onChange={(e) => setForm((prev) => ({ ...prev, purchase_date: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{t("Purchase price (TZS)")}</label>
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
          <label className="mb-2 block text-sm font-medium">{t("Paid by")}</label>
          <input
            type="text"
            value={form.paid_by}
            onChange={(e) => setForm((prev) => ({ ...prev, paid_by: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder={t("Partner name or Farm")}
            list={payerSuggestions.length > 0 ? payerListId : undefined}
          />
          {payerSuggestions.length > 0 && (
            <datalist id={payerListId}>
              {payerSuggestions.map((name) => <option key={name} value={name} />)}
            </datalist>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">{t("Notes")}</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder={t("Serial number, supplier, etc.")}
          />
        </div>

        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t("Saving asset...") : t(submitLabel ?? "Save asset")}
        </button>
      </form>
    </div>
  );
}
