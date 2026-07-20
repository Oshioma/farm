"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { getProfileFields, updateProfileField } from "@/lib/community/profileFields";
import type { ProfileFieldDef } from "@/lib/community/types";
import { Card, EmptyState } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

export default function DirectoryAdminPage() {
  const { community } = useAdminContext();
  const [fields, setFields] = useState<ProfileFieldDef[] | null>(null);

  useEffect(() => {
    getProfileFields(community.id).then(setFields);
  }, [community.id]);

  async function toggle(field: ProfileFieldDef) {
    const filterable = !field.filterable;
    setFields((prev) => prev?.map((f) => (f.id === field.id ? { ...f, filterable } : f)) ?? null);
    await updateProfileField(field.id, { filterable, show_in_directory: filterable || field.show_in_directory });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Directory</h1>
      <p className="mt-1 text-sm text-zinc-500">Choose which profile fields members can filter the Member Directory by.</p>

      <div className="mt-6 space-y-2">
        {fields === null ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : fields.length === 0 ? (
          <EmptyState
            icon="sliders-horizontal"
            title="No profile fields yet"
            description="Add profile fields first, then choose which ones power directory filters."
            action={
              <Link href={`/community/${community.slug}/admin/profile-fields`} className="text-sm font-semibold text-zinc-900 underline">
                Go to Profile Fields
              </Link>
            }
          />
        ) : (
          fields.map((f) => (
            <Card key={f.id} className="flex items-center gap-3 p-3.5">
              <DynamicIcon name={f.filterable ? "check-square" : "square"} size={16} className="text-zinc-400" />
              <span className="min-w-0 flex-1 text-sm font-semibold text-zinc-900">{f.label}</span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">{f.field_type}</span>
              <button
                type="button"
                onClick={() => toggle(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  f.filterable ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:border-zinc-900"
                }`}
              >
                {f.filterable ? "Filter enabled" : "Enable filter"}
              </button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
