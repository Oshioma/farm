"use client";

import { useState, useEffect, useRef } from "react";
import type { Zone, Crop } from "@/lib/farm";

export type PestFormData = {
  pest_name: string;
  severity: string;
  description: string;
  action_taken: string;
  logged_date: string;
  crop_id: string;
  zone_id: string;
  image_url: string;
  image_file: File | null;
};

const blank: PestFormData = {
  pest_name: "",
  severity: "medium",
  description: "",
  action_taken: "",
  logged_date: "",
  crop_id: "",
  zone_id: "",
  image_url: "",
  image_file: null,
};

type Props = {
  zones: Zone[];
  crops: Crop[];
  defaultZoneId: string;
  onSubmit: (data: PestFormData) => Promise<boolean>;
  initialData?: PestFormData;
  submitLabel?: string;
};

export function PestForm({
  zones,
  crops,
  defaultZoneId,
  onSubmit,
  initialData,
  submitLabel = "Log pest issue",
}: Props) {
  const [form, setForm] = useState<PestFormData>(initialData ?? blank);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
      // If editing an existing record with an image_url, show it as the preview
      if (initialData.image_url) {
        setPreview(initialData.image_url);
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (!initialData && defaultZoneId) {
      setForm((prev) => (prev.zone_id ? prev : { ...prev, zone_id: defaultZoneId }));
    }
  }, [defaultZoneId, initialData]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, image_file: f }));
    if (f) {
      // Revoke previous blob URL to avoid memory leaks
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(initialData?.image_url ?? "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
      setPreview("");
      setForm({ ...blank, zone_id: defaultZoneId });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">{submitLabel}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Record what you saw, where, and what you did about it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Pest / issue</label>
          <input
            type="text"
            value={form.pest_name}
            onChange={(e) => setForm((prev) => ({ ...prev, pest_name: e.target.value }))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Aphids, whitefly, fungal blight…"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Severity</label>
            <select
              value={form.severity}
              onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Date spotted</label>
            <input
              type="date"
              value={form.logged_date}
              onChange={(e) => setForm((prev) => ({ ...prev, logged_date: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Crop</label>
            <select
              value={form.crop_id}
              onChange={(e) => setForm((prev) => ({ ...prev, crop_id: e.target.value }))}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            >
              <option value="">No specific crop</option>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name}{crop.variety ? ` · ${crop.variety}` : ""}
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

        <div>
          <label className="mb-2 block text-sm font-medium">
            Photo <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-sm text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-200"
          />
        </div>

        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="h-48 w-full rounded-2xl object-cover"
          />
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium">What you saw</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="min-h-[80px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Yellowing leaves on lower stems, clusters on underside…"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Action taken</label>
          <textarea
            value={form.action_taken}
            onChange={(e) => setForm((prev) => ({ ...prev, action_taken: e.target.value }))}
            className="min-h-[80px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            placeholder="Sprayed neem oil, removed affected leaves…"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !form.pest_name.trim()}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </form>
    </div>
  );
}
