"use client";

import { useEffect, useState } from "react";
import { useAdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { createProfileField, deleteProfileField, getProfileFields, updateProfileField } from "@/lib/community/profileFields";
import type { ProfileFieldDef, ProfileFieldType } from "@/lib/community/types";
import { Button, Card } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

const FIELD_TYPES: ProfileFieldType[] = [
  "text", "textarea", "number", "location", "website", "social_links", "checkbox",
  "select", "radio", "date", "photo", "gallery", "skills", "interests",
  "needs_help_with", "can_help_with", "experience_level", "custom",
];

export default function ProfileFieldsAdminPage() {
  const { community } = useAdminContext();
  const [fields, setFields] = useState<ProfileFieldDef[] | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ProfileFieldType>("text");

  useEffect(() => {
    getProfileFields(community.id).then(setFields);
  }, [community.id]);

  async function addField() {
    if (!label.trim()) return;
    const key = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `field_${fields?.length ?? 0}`;
    const created = await createProfileField({
      community_id: community.id,
      key,
      label: label.trim(),
      field_type: type,
      options: [],
      required: false,
      show_in_directory: false,
      filterable: false,
      sort_order: fields?.length ?? 0,
    });
    setFields((prev) => [...(prev ?? []), created]);
    setLabel("");
  }

  async function toggle(field: ProfileFieldDef, key: "show_in_directory" | "filterable" | "required") {
    const patch = { [key]: !field[key] };
    setFields((prev) => prev?.map((f) => (f.id === field.id ? { ...f, ...patch } : f)) ?? null);
    await updateProfileField(field.id, patch);
  }

  async function remove(id: string) {
    await deleteProfileField(id);
    setFields((prev) => prev?.filter((f) => f.id !== id) ?? null);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Profile Fields</h1>
      <p className="mt-1 text-sm text-zinc-500">Define what every member profile in {community.name} looks like.</p>

      <div className="mt-6 space-y-2">
        {fields?.map((f) => (
          <Card key={f.id} className="flex flex-wrap items-center gap-3 p-3.5">
            <span className="min-w-0 flex-1 text-sm font-semibold text-zinc-900">{f.label}</span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">{f.field_type}</span>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              <input type="checkbox" checked={f.show_in_directory} onChange={() => toggle(f, "show_in_directory")} />
              In Directory
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              <input type="checkbox" checked={f.filterable} onChange={() => toggle(f, "filterable")} />
              Filterable
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              <input type="checkbox" checked={f.required} onChange={() => toggle(f, "required")} />
              Required
            </label>
            <button type="button" onClick={() => remove(f.id)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600">
              <DynamicIcon name="trash-2" size={15} />
            </button>
          </Card>
        ))}
      </div>

      <Card className="mt-4 flex flex-wrap items-center gap-2 p-4">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Field label, e.g. Experience Level"
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
        <select value={type} onChange={(e) => setType(e.target.value as ProfileFieldType)} className="rounded-lg border border-zinc-200 px-2.5 py-2 text-sm outline-none">
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={addField}>
          <DynamicIcon name="plus" size={14} />
          Add Field
        </Button>
      </Card>
    </div>
  );
}
