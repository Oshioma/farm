"use client";

import { useEffect, useState } from "react";
import { useAdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { supabase } from "@/lib/supabase";
import { getSpaces } from "@/lib/community/spaces";
import type { Space } from "@/lib/community/types";
import { Card } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

interface SpaceActivity {
  space: Space;
  itemCount: number;
}

export default function AnalyticsAdminPage() {
  const { community } = useAdminContext();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [activity, setActivity] = useState<SpaceActivity[] | null>(null);

  useEffect(() => {
    (async () => {
      const [{ count: members }, spaces] = await Promise.all([
        supabase.from("community_members").select("id", { count: "exact", head: true }).eq("community_id", community.id).eq("status", "active"),
        getSpaces(community.id),
      ]);
      setMemberCount(members ?? 0);

      const counts = await Promise.all(
        spaces.map(async (space) => {
          const { count } = await supabase.from("space_items").select("id", { count: "exact", head: true }).eq("space_id", space.id);
          return { space, itemCount: count ?? 0 };
        })
      );
      counts.sort((a, b) => b.itemCount - a.itemCount);
      setActivity(counts);
      setTotalItems(counts.reduce((sum, c) => sum + c.itemCount, 0));
    })();
  }, [community.id]);

  const maxCount = Math.max(1, ...(activity?.map((a) => a.itemCount) ?? [1]));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Analytics</h1>
      <p className="mt-1 text-sm text-zinc-500">Live activity across {community.name}.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-2xl font-extrabold text-zinc-900">{memberCount ?? "–"}</p>
          <p className="mt-1 text-sm text-zinc-500">Active members</p>
        </Card>
        <Card className="p-5">
          <p className="text-2xl font-extrabold text-zinc-900">{totalItems ?? "–"}</p>
          <p className="mt-1 text-sm text-zinc-500">Posts &amp; journal entries</p>
        </Card>
      </div>

      <Card className="mt-4 p-6">
        <h2 className="text-sm font-bold text-zinc-900">Most active Spaces</h2>
        <div className="mt-4 space-y-3">
          {activity === null ? (
            <p className="text-sm text-zinc-400">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-zinc-400">No Spaces yet.</p>
          ) : (
            activity.slice(0, 8).map((a) => (
              <div key={a.space.id} className="flex items-center gap-3">
                <DynamicIcon name={a.space.icon} size={14} className="shrink-0 text-zinc-500" />
                <span className="w-32 shrink-0 truncate text-xs font-medium text-zinc-700">{a.space.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-zinc-900" style={{ width: `${(a.itemCount / maxCount) * 100}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-semibold text-zinc-500">{a.itemCount}</span>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-white/60 p-4 text-xs text-zinc-500">
        Deeper analytics — retention curves, revenue, cohort comparisons — are on the roadmap. See the implementation plan for details.
      </div>
    </div>
  );
}
