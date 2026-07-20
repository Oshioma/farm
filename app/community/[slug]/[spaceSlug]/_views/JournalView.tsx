"use client";

import { useEffect, useState } from "react";
import type { JournalFieldDef, Space } from "@/lib/community/types";
import { createJournalEntry, getJournalFields, listJournalEntries } from "@/lib/community/journal";
import type { SpaceItem } from "@/lib/community/types";
import { Button, Card, EmptyState } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

export function JournalView({ space, memberId, communityId }: { space: Space; memberId: string; communityId: string }) {
  const [fields, setFields] = useState<JournalFieldDef[]>([]);
  const [entries, setEntries] = useState<SpaceItem[] | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getJournalFields(space.id).then(setFields);
    listJournalEntries(space.id).then(setEntries);
  }, [space.id]);

  function setValue(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    setSaving(true);
    const created = await createJournalEntry(communityId, space.id, memberId, values);
    setEntries((prev) => [created, ...(prev ?? [])]);
    setValues({});
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <p className="text-sm font-bold text-zinc-900">New entry</p>
        {fields.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-400">No fields configured for this journal yet.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <JournalFieldInput key={f.id} field={f} value={values[f.key]} onChange={(v) => setValue(f.key, v)} />
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={submit} disabled={saving || fields.length === 0}>
            Log Entry
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        {entries === null ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : entries.length === 0 ? (
          <EmptyState icon="notebook-pen" title="No entries yet" description="Log your first entry above to start your journal." />
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} className="p-4">
              <p className="text-xs text-zinc-400">{new Date(entry.created_at).toLocaleString()}</p>
              <div className="mt-1.5 space-y-1">
                {fields
                  .filter((f) => entry.data[f.key] !== undefined && entry.data[f.key] !== "" && entry.data[f.key] !== null)
                  .map((f) => (
                    <p key={f.id} className="text-sm text-zinc-700">
                      <span className="font-semibold text-zinc-500">{f.label}: </span>
                      {String(entry.data[f.key])}
                    </p>
                  ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function JournalFieldInput({ field, value, onChange }: { field: JournalFieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const label = (
    <span className="text-xs font-semibold text-zinc-600">
      {field.label}
      {field.required && <span className="text-red-500"> *</span>}
    </span>
  );

  if (field.field_type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }

  if (field.field_type === "textarea") {
    return (
      <label className="col-span-2 block">
        {label}
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
      </label>
    );
  }

  if (field.field_type === "select" || field.field_type === "mood" || field.field_type === "weather" || field.field_type === "moon_phase") {
    const options = field.options.length ? field.options : DEFAULT_OPTIONS[field.field_type] ?? [];
    return (
      <label className="block">
        {label}
        <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900">
          <option value="">Select…</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.field_type === "number" || field.field_type === "rating") {
    return (
      <label className="block">
        {label}
        <input type="number" value={(value as number) ?? ""} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
      </label>
    );
  }

  if (field.field_type === "date") {
    return (
      <label className="block">
        {label}
        <input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
      </label>
    );
  }

  if (field.field_type === "photos" || field.field_type === "videos") {
    return (
      <label className="col-span-2 block">
        {label}
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-400">
          <DynamicIcon name={field.field_type === "photos" ? "image" : "video"} size={14} />
          Uploads aren&apos;t wired up yet — add a URL for now
        </div>
        <input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://…" className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
      </label>
    );
  }

  return (
    <label className="block">
      {label}
      <input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
    </label>
  );
}

const DEFAULT_OPTIONS: Record<string, string[]> = {
  mood: ["Great", "Good", "Okay", "Tough"],
  weather: ["Sunny", "Cloudy", "Rainy", "Windy", "Frost"],
  moon_phase: ["New Moon", "Waxing", "Full Moon", "Waning"],
};
