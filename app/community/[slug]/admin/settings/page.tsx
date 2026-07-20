"use client";

import { useState } from "react";
import { useAdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { updateCommunity } from "@/lib/community/communities";
import type { CommunityPrivacy } from "@/lib/community/types";
import { Button, Card } from "@/app/community/_ui/primitives";
import { FileUploader } from "@/app/community/_ui/FileUploader";
import { DynamicIcon } from "@/lib/community/icon";

const PRIVACY_OPTIONS: { value: CommunityPrivacy; label: string; icon: string }[] = [
  { value: "public", label: "Public", icon: "globe" },
  { value: "private", label: "Private", icon: "lock" },
  { value: "invite_only", label: "Invite Only", icon: "mail" },
];

export default function SettingsAdminPage() {
  const { community, refresh } = useAdminContext();
  const [form, setForm] = useState({
    name: community.name,
    description: community.description ?? "",
    logo_url: community.logo_url ?? "",
    banner_url: community.banner_url ?? "",
    privacy: community.privacy,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await updateCommunity(community.id, form);
    refresh();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">Core details for {community.name}.</p>

      <Card className="mt-6 space-y-5 p-6">
        <label className="block">
          <span className="text-sm font-semibold text-zinc-800">Name</span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-800">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className="text-sm font-semibold text-zinc-800">Logo</span>
            <div className="mt-1.5">
              <FileUploader
                scope={`${community.id}/logo`}
                kind="image"
                multiple={false}
                value={form.logo_url ? [form.logo_url] : []}
                onChange={(urls) => setForm({ ...form, logo_url: urls[0] ?? "" })}
              />
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold text-zinc-800">Banner</span>
            <div className="mt-1.5">
              <FileUploader
                scope={`${community.id}/banner`}
                kind="image"
                multiple={false}
                value={form.banner_url ? [form.banner_url] : []}
                onChange={(urls) => setForm({ ...form, banner_url: urls[0] ?? "" })}
              />
            </div>
          </div>
        </div>

        <div>
          <span className="text-sm font-semibold text-zinc-800">Privacy</span>
          <div className="mt-2 flex gap-2">
            {PRIVACY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, privacy: opt.value })}
                className={`flex items-center gap-1.5 rounded-xl border-2 px-3.5 py-2 text-xs font-semibold transition ${
                  form.privacy === opt.value ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                }`}
              >
                <DynamicIcon name={opt.icon} size={14} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

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
