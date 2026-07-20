import { supabase } from "@/lib/supabase";
import type { MemberTimelineEvent, TimelineEventType } from "@/lib/community/types";

export async function recordTimelineEvent(input: {
  communityId: string;
  memberId: string;
  spaceId?: string | null;
  eventType: TimelineEventType;
  refTable?: string | null;
  refId?: string | null;
  title: string;
  summary?: string | null;
  data?: Record<string, unknown>;
}): Promise<string> {
  const { data, error } = await supabase.rpc("record_timeline_event", {
    p_community_id: input.communityId,
    p_member_id: input.memberId,
    p_space_id: input.spaceId ?? null,
    p_event_type: input.eventType,
    p_ref_table: input.refTable ?? null,
    p_ref_id: input.refId ?? null,
    p_title: input.title,
    p_summary: input.summary ?? null,
    p_data: input.data ?? {},
  });
  if (error) throw error;
  return data as string;
}

export async function getMemberTimeline(memberId: string): Promise<MemberTimelineEvent[]> {
  const { data, error } = await supabase
    .from("member_timeline_events")
    .select("*")
    .eq("member_id", memberId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCommunityTimeline(communityId: string, limit = 50): Promise<MemberTimelineEvent[]> {
  const { data, error } = await supabase
    .from("member_timeline_events")
    .select("*")
    .eq("community_id", communityId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export interface AnnualRecap {
  year: number;
  journalEntries: number;
  challengesCompleted: number;
  photosShared: number;
  milestones: number;
  topTags: { tag: string; count: number }[];
  mostActiveMonth: string | null;
  longestStreakDays: number;
}

export function buildAnnualRecap(events: MemberTimelineEvent[], year: number): AnnualRecap {
  const yearEvents = events.filter((e) => new Date(e.occurred_at).getFullYear() === year);

  const tagCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();
  const days = new Set<string>();

  for (const e of yearEvents) {
    const occurred = new Date(e.occurred_at);
    const monthKey = occurred.toLocaleString("en-US", { month: "long" });
    monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1);
    days.add(occurred.toISOString().slice(0, 10));

    const tags = (e.data?.tags as string[] | undefined) ?? [];
    for (const tag of tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  const sortedDays = Array.from(days).sort();
  let longestStreak = 0;
  let currentStreak = 0;
  let prev: Date | null = null;
  for (const d of sortedDays) {
    const date = new Date(d);
    if (prev && (date.getTime() - prev.getTime()) / 86400000 === 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
    prev = date;
  }

  let mostActiveMonth: string | null = null;
  let mostActiveCount = 0;
  for (const [month, count] of monthCounts) {
    if (count > mostActiveCount) {
      mostActiveMonth = month;
      mostActiveCount = count;
    }
  }

  return {
    year,
    journalEntries: yearEvents.filter((e) => e.event_type === "journal_entry").length,
    challengesCompleted: yearEvents.filter((e) => e.event_type === "challenge_completed").length,
    photosShared: yearEvents.filter((e) => e.event_type === "photo").length,
    milestones: yearEvents.filter((e) => e.event_type === "milestone").length,
    topTags: Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count })),
    mostActiveMonth,
    longestStreakDays: longestStreak,
  };
}
