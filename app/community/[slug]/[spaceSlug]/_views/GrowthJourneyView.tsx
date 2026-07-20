"use client";

import { useEffect, useMemo, useState } from "react";
import { buildAnnualRecap, getMemberTimeline } from "@/lib/community/timeline";
import type { MemberTimelineEvent } from "@/lib/community/types";
import { Card, EmptyState, Pill } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

const EVENT_ICONS: Record<string, string> = {
  journal_entry: "notebook-pen",
  milestone: "flag",
  challenge_completed: "trophy",
  photo: "image",
  achievement: "award",
  badge: "medal",
  ai_summary: "sparkles",
  post: "message-square",
};

export function GrowthJourneyView({ memberId }: { communityId: string; memberId: string }) {
  const [events, setEvents] = useState<MemberTimelineEvent[] | null>(null);
  const [showRecap, setShowRecap] = useState(false);

  useEffect(() => {
    getMemberTimeline(memberId).then(setEvents);
  }, [memberId]);

  const grouped = useMemo(() => {
    if (!events) return [];
    const groups = new Map<string, MemberTimelineEvent[]>();
    for (const e of events) {
      const d = new Date(e.occurred_at);
      const key = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return Array.from(groups.entries());
  }, [events]);

  const recap = useMemo(() => (events ? buildAnnualRecap(events, new Date().getFullYear()) : null), [events]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => setShowRecap((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900">
          <DynamicIcon name="sparkles" size={14} />
          {showRecap ? "Hide" : "Show"} Annual Recap
        </button>
      </div>

      {showRecap && recap && (
        <Card className="mb-6 bg-zinc-900 p-6 text-white">
          <p className="text-sm font-bold">Your {recap.year} Recap</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <RecapStat label="Journal entries" value={recap.journalEntries} />
            <RecapStat label="Challenges completed" value={recap.challengesCompleted} />
            <RecapStat label="Photos shared" value={recap.photosShared} />
            <RecapStat label="Milestones" value={recap.milestones} />
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-300">
            {recap.mostActiveMonth && <span>Most active: {recap.mostActiveMonth}</span>}
            <span>Longest streak: {recap.longestStreakDays} days</span>
            {recap.topTags.length > 0 && <span>Top tag: {recap.topTags[0].tag}</span>}
          </div>
        </Card>
      )}

      {events === null ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : events.length === 0 ? (
        <EmptyState icon="sprout" title="Your journey starts here" description="Log a journal entry or complete a challenge to start building your timeline." />
      ) : (
        <div className="space-y-8">
          {grouped.map(([month, monthEvents]) => (
            <div key={month}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">{month}</p>
              <div className="space-y-2 border-l-2 border-zinc-100 pl-4">
                {monthEvents.map((e) => (
                  <Card key={e.id} className="flex items-start gap-3 p-3.5">
                    <DynamicIcon name={EVENT_ICONS[e.event_type] ?? "circle"} size={15} className="mt-0.5 shrink-0 text-zinc-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900">{e.title}</p>
                      {e.summary && <p className="text-xs text-zinc-500">{e.summary}</p>}
                    </div>
                    <Pill>{new Date(e.occurred_at).toLocaleDateString()}</Pill>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecapStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  );
}
