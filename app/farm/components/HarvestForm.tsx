"use client";

import { useState, useEffect } from "react";
import type { Zone, Crop } from "@/lib/farm";
import { estimatedKg, isCountedCrop } from "@/lib/harvest";
import { useT } from "@/lib/i18n";

export type HarvestUnitMode = "units" | "kg";

export type HarvestFormData = {
  crop_id: string;
  zone_id: string;
  harvest_date: string;
  /** How the farmer is recording this harvest — a count or a weight. */
  unit_mode: HarvestUnitMode;
  /** Pieces picked; used when unit_mode is "units". */
  quantity_units: string;
  /** Kilos; required for "kg", optional alongside a count. */
  quantity_kg: string;
  /** Average weight of one piece; turns a count into an estimated weight. */
  kg_per_unit: string;
  quality: string;
  notes: string;
};

const blank: HarvestFormData = {
  crop_id: "",
  zone_id: "",
  harvest_date: "",
  unit_mode: "kg",
  quantity_units: "",
  quantity_kg: "",
  kg_per_unit: "",
  quality: "standard",
  notes: "",
};

/* Counted crops (mangoes, watermelons) start on a count; everything else on kilos. */
function modeFor(crop: Crop | null | undefined): HarvestUnitMode {
  return isCountedCrop(crop?.crop_name) ? "units" : "kg";
}

function perPieceFor(crop: Crop | null | undefined): string {
  return crop?.kg_per_unit ? String(crop.kg_per_unit) : "";
}

type Props = {
  zones: Zone[];
  crops: Crop[];
  defaultCropId: string;
  defaultZoneId: string;
  onSubmit: (data: HarvestFormData) => Promise<boolean>;
};

export function HarvestForm({ zones, crops, defaultCropId, defaultZoneId, onSubmit }: Props) {
  const t = useT();
  const [form, setForm] = useState<HarvestFormData>(blank);
  const [saving, setSaving] = useState(false);

  const selectedCrop = crops.find((c) => c.id === form.crop_id) ?? null;
  const canCount = isCountedCrop(selectedCrop?.crop_name);
  const counting = canCount && form.unit_mode === "units";
  const estimate = counting && !form.quantity_kg.trim() ? estimatedKg(form.quantity_units, form.kg_per_unit) : null;

  useEffect(() => {
    if (defaultCropId) {
      setForm((prev) =>
        prev.crop_id
          ? prev
          : {
              ...prev,
              crop_id: defaultCropId,
              zone_id: defaultZoneId,
              unit_mode: modeFor(crops.find((c) => c.id === defaultCropId)),
              kg_per_unit: perPieceFor(crops.find((c) => c.id === defaultCropId)),
            }
      );
    }
  }, [defaultCropId, defaultZoneId, crops]);

  function stepCount(delta: number) {
    setForm((prev) => {
      const current = Math.max(0, Math.floor(Number(prev.quantity_units) || 0));
      const next = Math.max(0, current + delta);
      return { ...prev, quantity_units: next ? String(next) : "" };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    /* A crop that cannot be counted is always recorded in kilos, whatever
       mode was left over from a previously selected crop. */
    const ok = await onSubmit(
      canCount ? form : { ...form, unit_mode: "kg", quantity_units: "", kg_per_unit: "" }
    );
    setSaving(false);
    if (ok) setForm(blank);
  }

  const inputClass =
    "w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900";
  const toggleClass = (active: boolean) =>
    `flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
      active ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-600 hover:text-zinc-900"
    }`;

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">{t("Log harvest")}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {t("Record actual yield and push the crop into real production data.")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">{t("Crop")}</label>
          <select
            value={form.crop_id}
            onChange={(e) => {
              const selected = crops.find((c) => c.id === e.target.value) ?? null;
              setForm((prev) => ({
                ...prev,
                crop_id: e.target.value,
                zone_id: selected?.zone_id ?? "",
                unit_mode: modeFor(selected),
                quantity_units: "",
                quantity_kg: "",
                kg_per_unit: perPieceFor(selected),
              }));
            }}
            className={inputClass}
            required
          >
            <option value="">{t("Select crop")}</option>
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
            className={inputClass}
          >
            <option value="">{t("No bed")}</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">{t("Harvest date")}</label>
          <input
            type="date"
            value={form.harvest_date}
            onChange={(e) => setForm((prev) => ({ ...prev, harvest_date: e.target.value }))}
            className={inputClass}
            required
          />
        </div>

        {canCount && (
          <div>
            <label className="mb-2 block text-sm font-medium">{t("Record by")}</label>
            <div className="flex gap-1 rounded-2xl bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, unit_mode: "units" }))}
                className={toggleClass(form.unit_mode === "units")}
                aria-pressed={form.unit_mode === "units"}
              >
                {t("Count (pieces)")}
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, unit_mode: "kg" }))}
                className={toggleClass(form.unit_mode === "kg")}
                aria-pressed={form.unit_mode === "kg"}
              >
                {t("Weight (kg)")}
              </button>
            </div>
          </div>
        )}

        {counting ? (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium">{t("How many picked?")}</label>
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => stepCount(-1)}
                  className="w-14 rounded-2xl border border-zinc-300 text-2xl font-semibold text-zinc-700 hover:bg-zinc-50"
                  aria-label={t("One less")}
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  value={form.quantity_units}
                  onChange={(e) => setForm((prev) => ({ ...prev, quantity_units: e.target.value }))}
                  className={`${inputClass} text-center text-lg font-semibold`}
                  placeholder="0"
                  required
                />
                <button
                  type="button"
                  onClick={() => stepCount(1)}
                  className="w-14 rounded-2xl border border-zinc-300 text-2xl font-semibold text-zinc-700 hover:bg-zinc-50"
                  aria-label={t("One more")}
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {[5, 10, 50].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => stepCount(n)}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    +{n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("Total weight (kg)")}{" "}
                <span className="font-normal text-zinc-400">{t("(optional)")}</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.quantity_kg}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity_kg: e.target.value }))}
                className={inputClass}
                placeholder={
                  estimate !== null
                    ? t("≈ {kg} kg estimated", { kg: estimate })
                    : t("Leave blank if not weighed")
                }
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                <span>{t("One piece weighs about")}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={form.kg_per_unit}
                  onChange={(e) => setForm((prev) => ({ ...prev, kg_per_unit: e.target.value }))}
                  className="w-24 rounded-xl border border-zinc-300 px-3 py-1.5 text-center outline-none focus:border-zinc-900"
                  placeholder={/melon|tikiti/i.test(selectedCrop?.crop_name ?? "") ? "5" : "0.3"}
                  aria-label={t("Average weight of one piece (kg)")}
                />
                <span>{t("kg")}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {estimate !== null
                  ? t("No scale? We'll save ≈ {kg} kg as an estimate.", { kg: estimate })
                  : t("Set this once and the weight is estimated from the count next time.")}
              </p>
            </div>
          </>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-medium">{t("Quantity (kg)")}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.quantity_kg}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity_kg: e.target.value }))}
              className={inputClass}
              placeholder="120"
              required
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium">{t("Quality")}</label>
          <select
            value={form.quality}
            onChange={(e) => setForm((prev) => ({ ...prev, quality: e.target.value }))}
            className={inputClass}
          >
            <option value="premium">{t("premium")}</option>
            <option value="standard">{t("standard")}</option>
            <option value="lower_grade">{t("lower_grade")}</option>
            <option value="mixed">{t("mixed")}</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">{t("Notes")}</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="min-h-[100px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder={t("Any notes on quality, weather, or batch.")}
          />
        </div>

        <button
          type="submit"
          disabled={saving || !form.crop_id}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t("Logging harvest...") : t("Log harvest")}
        </button>
      </form>
    </div>
  );
}
