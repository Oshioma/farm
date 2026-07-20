import { supabase } from "@/lib/supabase";
import type { ProfileFieldDef, ProfileFieldValue } from "@/lib/community/types";

export async function getProfileFields(communityId: string): Promise<ProfileFieldDef[]> {
  const { data, error } = await supabase
    .from("community_profile_field_defs")
    .select("*")
    .eq("community_id", communityId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function createProfileField(input: Omit<ProfileFieldDef, "id" | "created_at">): Promise<ProfileFieldDef> {
  const { data, error } = await supabase.from("community_profile_field_defs").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateProfileField(id: string, patch: Partial<ProfileFieldDef>): Promise<ProfileFieldDef> {
  const { data, error } = await supabase.from("community_profile_field_defs").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProfileField(id: string): Promise<void> {
  const { error } = await supabase.from("community_profile_field_defs").delete().eq("id", id);
  if (error) throw error;
}

export async function getMemberProfileValues(memberId: string): Promise<ProfileFieldValue[]> {
  const { data, error } = await supabase.from("community_member_profile_values").select("*").eq("member_id", memberId);
  if (error) throw error;
  return data ?? [];
}

export async function upsertProfileValue(memberId: string, fieldId: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("community_member_profile_values")
    .upsert({ member_id: memberId, field_id: fieldId, value: value ?? null, updated_at: new Date().toISOString() }, { onConflict: "member_id,field_id" });
  if (error) throw error;
}
