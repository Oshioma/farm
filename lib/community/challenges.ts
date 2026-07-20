import { supabase } from "@/lib/supabase";
import type { Challenge, ChallengeParticipant, CommunityMember } from "@/lib/community/types";
import { recordTimelineEvent } from "@/lib/community/timeline";
import { listMembers } from "@/lib/community/members";

export async function getChallenges(communityId: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("community_id", communityId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createChallenge(input: Omit<Challenge, "id" | "created_at" | "updated_at" | "is_active">): Promise<Challenge> {
  const { data, error } = await supabase.from("challenges").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateChallenge(id: string, patch: Partial<Challenge>): Promise<Challenge> {
  const { data, error } = await supabase.from("challenges").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteChallenge(id: string): Promise<void> {
  const { error } = await supabase.from("challenges").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

export async function getParticipants(challengeId: string): Promise<ChallengeParticipant[]> {
  const { data, error } = await supabase.from("challenge_participants").select("*").eq("challenge_id", challengeId);
  if (error) throw error;
  return data ?? [];
}

export async function joinChallenge(challengeId: string, memberId: string): Promise<ChallengeParticipant> {
  const { data, error } = await supabase
    .from("challenge_participants")
    .upsert({ challenge_id: challengeId, member_id: memberId }, { onConflict: "challenge_id,member_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function completeChallenge(
  communityId: string,
  challenge: Challenge,
  memberId: string
): Promise<ChallengeParticipant> {
  const { data, error } = await supabase
    .from("challenge_participants")
    .update({ status: "completed", completed_at: new Date().toISOString(), points_earned: challenge.points })
    .eq("challenge_id", challenge.id)
    .eq("member_id", memberId)
    .select()
    .single();
  if (error) throw error;

  await recordTimelineEvent({
    communityId,
    memberId,
    eventType: "challenge_completed",
    refTable: "challenges",
    refId: challenge.id,
    title: `Completed "${challenge.name}"`,
    summary: `Earned ${challenge.points} points`,
  });

  return data;
}

export interface LeaderboardRow {
  member: CommunityMember;
  points: number;
}

export async function getLeaderboard(communityId: string): Promise<LeaderboardRow[]> {
  const { data: challenges, error } = await supabase.from("challenges").select("id").eq("community_id", communityId);
  if (error) throw error;

  const challengeIds = (challenges ?? []).map((c) => c.id);
  if (!challengeIds.length) return [];

  const { data: participants, error: participantsError } = await supabase
    .from("challenge_participants")
    .select("member_id, points_earned")
    .in("challenge_id", challengeIds);
  if (participantsError) throw participantsError;

  const pointsByMember = new Map<string, number>();
  for (const p of participants ?? []) {
    pointsByMember.set(p.member_id, (pointsByMember.get(p.member_id) ?? 0) + p.points_earned);
  }

  const members = await listMembers(communityId);
  return members
    .filter((m) => pointsByMember.has(m.id))
    .map((member) => ({ member, points: pointsByMember.get(member.id)! }))
    .sort((a, b) => b.points - a.points);
}
