"use client";

import { useEffect, useState } from "react";
import { useCommunityContext } from "@/app/community/[slug]/_lib/CommunityContext";
import { getProfileFields, getMemberProfileValues, upsertProfileValue } from "@/lib/community/profileFields";
import { updateMyProfile } from "@/lib/community/members";
import type { ProfileFieldDef, ProfileFieldType } from "@/lib/community/types";
import { Button, Card } from "@/app/community/_ui/primitives";
import { FileUploader } from "@/app/community/_ui/FileUploader";

export default function EditProfilePage() {
  const { community, membership, refresh } = useCommunityContext();
  const [fields, setFields] = useState<ProfileFieldDef[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [displayName, setDisplayName] = useState(membership.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(membership.avatar_url ?? "");
  const [bio, setBio] = useState(membership.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const defs = await getProfileFields(community.id);
      setFields(defs);
      const existing = await getMemberProfileValues(membership.id);
      setValues(Object.fromEntries(existing.map((v) => [v.field_id, v.value])));
    })();
  }, [community.id, membership.id]);

  function setValue(fieldId: string, value: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    await updateMyProfile(membership.id, { display_name: displayName, avatar_url: avatarUrl, bio });
    await Promise.all(fields.map((f) => upsertProfileValue(membership.id, f.id, values[f.id] ?? null)));
    refresh();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Edit Profile</h1>
      <p className="mt-1 text-sm text-zinc-500">How you show up in {community.name}.</p>

      <Card className="mt-6 space-y-5 p-6">
        <div>
          <span className="text-sm font-semibold text-zinc-800">Avatar</span>
          <div className="mt-1.5 flex items-center gap-4">
            {avatarUrl && <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full border border-zinc-200 object-cover" />}
            <FileUploader
              scope={`${community.id}/avatars`}
              kind="image"
              multiple={false}
              value={avatarUrl ? [avatarUrl] : []}
              onChange={(urls) => setAvatarUrl(urls[0] ?? "")}
            />
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-800">Display Name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-800">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
          />
        </label>

        {fields.map((f) => (
          <ProfileFieldInput key={f.id} field={f} value={values[f.id]} onChange={(v) => setValue(f.id, v)} scope={`${community.id}/profile-fields`} />
        ))}

        <div className="flex items-center gap-3 border-t border-zinc-200 pt-4">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
          {saved && <span className="text-xs font-medium text-emerald-600">Saved</span>}
        </div>
      </Card>
    </div>
  );
}

const LIST_TYPES: ProfileFieldType[] = ["skills", "interests", "needs_help_with", "can_help_with", "social_links"];

function ProfileFieldInput({
  field,
  value,
  onChange,
  scope,
}: {
  field: ProfileFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  scope: string;
}) {
  const label = <span className="text-sm font-semibold text-zinc-800">{field.label}</span>;

  if (field.field_type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }

  if (field.field_type === "textarea") {
    return (
      <label className="block">
        {label}
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
        />
      </label>
    );
  }

  if (field.field_type === "select" || field.field_type === "radio" || field.field_type === "experience_level") {
    const options = field.options.length ? field.options : field.field_type === "experience_level" ? ["Beginner", "Intermediate", "Advanced", "Expert"] : [];
    return (
      <label className="block">
        {label}
        <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900">
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

  if (field.field_type === "number") {
    return (
      <label className="block">
        {label}
        <input type="number" value={(value as number) ?? ""} onChange={(e) => onChange(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900" />
      </label>
    );
  }

  if (field.field_type === "date") {
    return (
      <label className="block">
        {label}
        <input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900" />
      </label>
    );
  }

  if (field.field_type === "photo") {
    return (
      <div>
        {label}
        <div className="mt-1.5">
          <FileUploader scope={scope} kind="image" multiple={false} value={value ? [value as string] : []} onChange={(urls) => onChange(urls[0] ?? "")} />
        </div>
      </div>
    );
  }

  if (field.field_type === "gallery") {
    return (
      <div>
        {label}
        <div className="mt-1.5">
          <FileUploader scope={scope} kind="image" value={(value as string[]) ?? []} onChange={onChange} maxFiles={12} />
        </div>
      </div>
    );
  }

  if (LIST_TYPES.includes(field.field_type)) {
    const list = (value as string[]) ?? [];
    return (
      <label className="block">
        {label}
        <textarea
          value={list.join("\n")}
          onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
          rows={2}
          placeholder="One per line"
          className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
        />
      </label>
    );
  }

  return (
    <label className="block">
      {label}
      <input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900" />
    </label>
  );
}
