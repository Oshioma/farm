"use client";

import { useEffect, useState } from "react";
import { useAdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { listMembers, updateMemberRole, updateMemberStatus } from "@/lib/community/members";
import type { CommunityMember } from "@/lib/community/types";
import { Card, EmptyState, Pill } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

const ROLES: CommunityMember["role"][] = ["member", "moderator", "admin", "owner"];

export default function MembersAdminPage() {
  const { community } = useAdminContext();
  const [members, setMembers] = useState<CommunityMember[] | null>(null);

  useEffect(() => {
    listMembers(community.id).then(setMembers);
  }, [community.id]);

  async function changeRole(member: CommunityMember, role: CommunityMember["role"]) {
    setMembers((prev) => prev?.map((m) => (m.id === member.id ? { ...m, role } : m)) ?? null);
    await updateMemberRole(member.id, role);
  }

  async function toggleBan(member: CommunityMember) {
    const status = member.status === "banned" ? "active" : "banned";
    setMembers((prev) => prev?.map((m) => (m.id === member.id ? { ...m, status } : m)) ?? null);
    await updateMemberStatus(member.id, status);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Members</h1>
      <p className="mt-1 text-sm text-zinc-500">{members?.length ?? "–"} people in {community.name}.</p>

      <div className="mt-6 space-y-2">
        {members === null ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : members.length === 0 ? (
          <EmptyState icon="users-round" title="No members yet" description="Members will show up here once people join your community." />
        ) : (
          members.map((m) => (
            <Card key={m.id} className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600">
                {(m.display_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-900">{m.display_name ?? "Member"}</p>
                <p className="text-xs text-zinc-400">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
              </div>
              {m.status === "banned" && <Pill tone="amber">Banned</Pill>}
              <select
                value={m.role}
                disabled={m.role === "owner"}
                onChange={(e) => changeRole(m, e.target.value as CommunityMember["role"])}
                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium capitalize outline-none disabled:opacity-50"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} disabled={r === "owner"}>
                    {r}
                  </option>
                ))}
              </select>
              {m.role !== "owner" && (
                <button
                  type="button"
                  onClick={() => toggleBan(m)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  title={m.status === "banned" ? "Unban" : "Ban"}
                >
                  <DynamicIcon name={m.status === "banned" ? "user-check" : "user-x"} size={16} />
                </button>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
