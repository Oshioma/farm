"use client";

import { useEffect, useState } from "react";
import { getLeaderboard, type LeaderboardRow } from "@/lib/community/challenges";
import { Card, EmptyState } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

const MEDAL_COLORS = ["text-amber-500", "text-zinc-400", "text-amber-700"];

export function LeaderboardView({ communityId }: { communityId: string }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    getLeaderboard(communityId).then(setRows);
  }, [communityId]);

  if (rows === null) return <p className="text-sm text-zinc-400">Loading…</p>;
  if (rows.length === 0) {
    return <EmptyState icon="trophy" title="No points yet" description="Points from completed challenges will show up here." />;
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <Card key={row.member.id} className="flex items-center gap-3 p-3.5">
          <span className="flex w-6 shrink-0 items-center justify-center">
            {i < 3 ? <DynamicIcon name="trophy" size={16} className={MEDAL_COLORS[i]} /> : <span className="text-xs font-bold text-zinc-400">{i + 1}</span>}
          </span>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">
            {(row.member.display_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{row.member.display_name ?? "Member"}</span>
          <span className="shrink-0 text-sm font-bold text-zinc-900">{row.points} pts</span>
        </Card>
      ))}
    </div>
  );
}
