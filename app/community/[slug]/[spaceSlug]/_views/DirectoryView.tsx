"use client";

import { useEffect, useMemo, useState } from "react";
import { listMembers } from "@/lib/community/members";
import { getProfileFields, getMemberProfileValues } from "@/lib/community/profileFields";
import type { CommunityMember, ProfileFieldDef, ProfileFieldValue } from "@/lib/community/types";
import { Card, EmptyState } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

interface MemberRow {
  member: CommunityMember;
  values: Record<string, unknown>;
}

export function DirectoryView({ communityId }: { communityId: string }) {
  const [fields, setFields] = useState<ProfileFieldDef[]>([]);
  const [rows, setRows] = useState<MemberRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [defs, members] = await Promise.all([getProfileFields(communityId), listMembers(communityId)]);
      setFields(defs);
      const withValues = await Promise.all(
        members
          .filter((m) => m.status === "active")
          .map(async (member) => {
            const values = await getMemberProfileValues(member.id);
            return { member, values: Object.fromEntries(values.map((v: ProfileFieldValue) => [v.field_id, v.value])) };
          })
      );
      setRows(withValues);
    })();
  }, [communityId]);

  const directoryFields = fields.filter((f) => f.show_in_directory);
  const filterFields = fields.filter((f) => f.filterable);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter(({ member, values }) => {
      if (search && !(member.display_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      for (const [fieldId, filterValue] of Object.entries(activeFilters)) {
        if (!filterValue) continue;
        const v = values[fieldId];
        if (!v || !String(v).toLowerCase().includes(filterValue.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, search, activeFilters]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
          <DynamicIcon name="search" size={14} className="text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members…" className="w-full text-sm outline-none" />
        </div>
        {filterFields.map((f) => (
          <input
            key={f.id}
            value={activeFilters[f.id] ?? ""}
            onChange={(e) => setActiveFilters((prev) => ({ ...prev, [f.id]: e.target.value }))}
            placeholder={`Filter by ${f.label}`}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
          />
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {rows === null ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="sm:col-span-2">
            <EmptyState icon="users" title="No members found" description="Try a different search or filter." />
          </div>
        ) : (
          filtered.map(({ member, values }) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600">
                  {(member.display_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-900">{member.display_name ?? "Member"}</p>
                  <p className="text-xs text-zinc-400 capitalize">{member.role}</p>
                </div>
              </div>
              {directoryFields.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {directoryFields
                    .filter((f) => values[f.id])
                    .map((f) => (
                      <p key={f.id} className="text-xs text-zinc-500">
                        <span className="font-medium text-zinc-400">{f.label}: </span>
                        {String(values[f.id])}
                      </p>
                    ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
