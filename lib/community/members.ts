import { supabase } from "@/lib/supabase";
import type { CommunityMember } from "@/lib/community/types";

export async function getMyMembership(communityId: string): Promise<CommunityMember | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("community_members")
    .select("*")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listMembers(communityId: string): Promise<CommunityMember[]> {
  const { data, error } = await supabase
    .from("community_members")
    .select("*")
    .eq("community_id", communityId)
    .order("joined_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function joinCommunity(communityId: string, role: CommunityMember["role"] = "member"): Promise<CommunityMember> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to join a community");

  const { data, error } = await supabase
    .from("community_members")
    .upsert(
      {
        community_id: communityId,
        user_id: user.id,
        role,
        display_name: user.user_metadata?.full_name ?? user.email,
      },
      { onConflict: "community_id,user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function requestToJoin(communityId: string): Promise<CommunityMember> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to request to join a community");

  const { data, error } = await supabase
    .from("community_members")
    .upsert(
      {
        community_id: communityId,
        user_id: user.id,
        role: "member",
        status: "pending",
        display_name: user.user_metadata?.full_name ?? user.email,
      },
      { onConflict: "community_id,user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMemberRole(memberId: string, role: CommunityMember["role"]): Promise<CommunityMember> {
  const { data, error } = await supabase.from("community_members").update({ role }).eq("id", memberId).select().single();
  if (error) throw error;
  return data;
}

export async function updateMemberStatus(memberId: string, status: CommunityMember["status"]): Promise<CommunityMember> {
  const { data, error } = await supabase.from("community_members").update({ status }).eq("id", memberId).select().single();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(
  memberId: string,
  patch: Partial<Pick<CommunityMember, "display_name" | "avatar_url" | "bio">>
): Promise<CommunityMember> {
  const { data, error } = await supabase.from("community_members").update(patch).eq("id", memberId).select().single();
  if (error) throw error;
  return data;
}
