"use client";

import { useState, useEffect, useRef } from "react";
import { CROP_DETAIL_FIELDS } from "@/lib/cropDetails";
import { useT } from "@/lib/i18n";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import type { Zone } from "@/lib/farm";

export type CropFormData = {
  crop_name: string;
  variety: string;
  zone_ids: string[];
  status: string;
  planted_on: string;
  expected_harvest_start: string;
  estimated_yield_kg: string;
  expected_sale_price_per_kg: string;
  notes: string;
  medicinal_properties: string;
  flavour: string;
  appearance: string;
  size: string;
  best_eaten: string;
  nutritional_qualities: string;
  why_special: string;
  image_file: File | null;
};

const blank: CropFormData = {
  crop_name: "",
  variety: "",
  zone_ids: [],
  status: "planned",
  planted_on: "",
  expected_harvest_start: "",
  estimated_yield_kg: "",
  expected_sale_price_per_kg: "",
  notes: "",
  medicinal_properties: "",
  flavour: "",
  appearance: "",
  size: "",
  best_eaten: "",
  nutritional_qualities: "",
  why_special: "",
  image_file: null,
};

type Props = {
  zones: Zone[];
  defaultZoneId: string;
  onSubmit: (data: CropFormData) => Promise<boolean>;
};

/* Three short stages instead of one long form. The crop can be saved from any
   stage: the basics are enough to create it, the other two are optional. */
type Stage = 1 | 2 | 3;

const inputClass = "w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900";

export function CropForm({ zones, defaultZoneId, onSubmit }: Props) {
  const t = useT();
  const [form, setForm] = useState<CropFormData>(blank);
  const [stage, setStage] = useState<Stage>(1);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultZoneId) {
      setForm((prev) => (prev.zone_ids.length ? prev : { ...prev, zone_ids: [defaultZoneId] }));
    }
  }, [defaultZoneId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, image_file: f }));
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : "");
  }

  function handleZoneChange(index: number, value: string) {
    setForm((prev) => {
      const next = [...prev.zone_ids];
      next[index] = value;
      return { ...prev, zone_ids: next };
    });
  }

  function addZone() {
    setForm((prev) => ({ ...prev, zone_ids: [...prev.zone_ids, ""] }));
  }

  function removeZone(index: number) {
    setForm((prev) => ({
      ...prev,
      zone_ids: prev.zone_ids.filter((_, i) => i !== index),
    }));
  }

  const canSave = !!form.crop_name.trim();

  /* Any stage can save; the form only submits from a button that says so. */
  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    const cleanedForm = { ...form, zone_ids: form.zone_ids.filter(Boolean) };
    const ok = await onSubmit(cleanedForm);
    setSaving(false);
    if (ok) {
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview("");
      setForm({ ...blank, zone_ids: defaultZoneId ? [defaultZoneId] : [] });
      setStage(1);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void save();
  }

  const selectedZoneIds = new Set(form.zone_ids.filter(Boolean));
  const stageTitle = stage === 1 ? t("Basics") : stage === 2 ? t("Growing details") : t("For the shop");

  const field = (label: React.ReactNode, control: React.ReactNode) => (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      {control}
    </div>
  );
  const optional = <span className="font-normal text-zinc-400">{t("(optional)")}</span>;

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">{t("Create crop")}</h2>
          <span className="text-xs font-medium text-zinc-500">{t("Step {n} of 3", { n: stage })}</span>
        </div>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3].map((n) => (
            <span key={n} className={"h-1.5 flex-1 rounded-full " + (n <= stage ? "bg-emerald-600" : "bg-zinc-200")} />
          ))}
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          {stageTitle}{stage > 1 && <> · {t("optional")}</>}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {stage === 1 && (
          <>
            {field(t("Crop name"), (
              <input type="text" value={form.crop_name} onChange={(e) => setForm((prev) => ({ ...prev, crop_name: e.target.value }))} className={inputClass} placeholder={t("Tomatoes")} required autoFocus />
            ))}
            {field(<>{t("Variety")} {optional}</>, (
              <input type="text" value={form.variety} onChange={(e) => setForm((prev) => ({ ...prev, variety: e.target.value }))} className={inputClass} placeholder={t("Roma")} />
            ))}
            {field(t("Expected harvest"), (
              <input type="date" value={form.expected_harvest_start} onChange={(e) => setForm((prev) => ({ ...prev, expected_harvest_start: e.target.value }))} className={inputClass} />
            ))}
            {field(t("Estimated yield (kg)"), (
              <input type="number" step="0.01" min="0" inputMode="decimal" value={form.estimated_yield_kg} onChange={(e) => setForm((prev) => ({ ...prev, estimated_yield_kg: e.target.value }))} className={inputClass} placeholder="900" />
            ))}
            {field(t("Expected price per kg"), (
              <input type="number" step="0.01" min="0" inputMode="decimal" value={form.expected_sale_price_per_kg} onChange={(e) => setForm((prev) => ({ ...prev, expected_sale_price_per_kg: e.target.value }))} className={inputClass} placeholder="3000" />
            ))}
          </>
        )}

        {stage === 2 && (
          <>
            {field(<>{t("Photo")} {optional}</>, (
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-200" />
            ))}
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={t("Preview")} className="h-48 w-full rounded-2xl object-cover" />
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium">{t("Beds")}</label>
              <div className="space-y-2">
                {form.zone_ids.map((zoneId, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select value={zoneId} onChange={(e) => handleZoneChange(index, e.target.value)} className={inputClass}>
                      <option value="">{t("Select bed")}</option>
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.id} disabled={selectedZoneIds.has(zone.id) && zone.id !== zoneId}>
                          {zone.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeZone(index)} className="flex-shrink-0 rounded-xl border border-zinc-200 p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600" title={t("Remove bed")}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {form.zone_ids.length < zones.length && (
                  <button type="button" onClick={addZone} className="flex items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700">
                    <Plus size={14} />
                    {form.zone_ids.length === 0 ? t("Add bed") : t("Add another bed")}
                  </button>
                )}
              </div>
            </div>

            {field(t("Status"), (
              <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} className={inputClass}>
                <option value="planned">{t("planned")}</option>
                <option value="planted">{t("planted")}</option>
                <option value="germinating">{t("germinating")}</option>
                <option value="growing">{t("growing")}</option>
                <option value="harvest_ready">{t("harvest_ready")}</option>
              </select>
            ))}
            {field(t("Planted on"), (
              <input type="date" value={form.planted_on} onChange={(e) => setForm((prev) => ({ ...prev, planted_on: e.target.value }))} className={inputClass} />
            ))}
            {field(<>{t("Notes")} {optional}</>, (
              <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className={"min-h-[80px] " + inputClass} placeholder={t("Growing conditions, observations…")} />
            ))}
          </>
        )}

        {stage === 3 && (
          <>
            <p className="text-xs text-zinc-500">
              {t("Whatever you fill in here is shown to customers on the shopfront. Anything left blank simply is not shown.")}
            </p>
            {CROP_DETAIL_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="mb-1.5 block text-sm font-medium">{t(f.label)}</label>
                {f.long ? (
                  <textarea value={form[f.key]} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} className={"min-h-[70px] " + inputClass} placeholder={t(f.placeholder)} />
                ) : (
                  <input type="text" value={form[f.key]} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} className={inputClass} placeholder={t(f.placeholder)} />
                )}
              </div>
            ))}
            {field(<>{t("Medicinal properties")} {optional}</>, (
              <textarea value={form.medicinal_properties} onChange={(e) => setForm((prev) => ({ ...prev, medicinal_properties: e.target.value }))} className={"min-h-[80px] " + inputClass} placeholder={t("Known medicinal uses, healing properties…")} />
            ))}
          </>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {stage > 1 && (
            <button type="button" onClick={() => setStage((s) => (s - 1) as Stage)} className="inline-flex items-center gap-1 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
              <ChevronLeft size={16} /> {t("Back")}
            </button>
          )}
          <button
            type="submit"
            disabled={saving || !canSave}
            className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t("Creating crop...") : t("Create crop")}
          </button>
          {stage < 3 && (
            <button type="button" onClick={() => setStage((s) => (s + 1) as Stage)} disabled={!canSave} className="inline-flex items-center gap-1 rounded-2xl border border-emerald-700 px-4 py-3 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
              {stage === 1 ? t("Next: growing details") : t("Next: for the shop")} <ChevronRight size={16} />
            </button>
          )}
        </div>
        {!canSave && <p className="text-xs text-zinc-500">{t("Enter a crop name to continue.")}</p>}
      </form>
    </div>
  );
}
