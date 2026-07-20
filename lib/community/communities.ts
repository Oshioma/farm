import { supabase } from "@/lib/supabase";
import type { Community, CommunityMember } from "@/lib/community/types";

export async function getCommunityBySlug(slug: string): Promise<Community | null> {
  const { data, error } = await supabase.from("communities").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCommunityById(id: string): Promise<Community | null> {
  const { data, error } = await supabase.from("communities").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMyCommunities(): Promise<(Community & { my_role: CommunityMember["role"] })[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("community_members")
    .select("role, communities(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.communities)
    .map((row) => ({ ...(row.communities as unknown as Community), my_role: row.role as CommunityMember["role"] }));
}

export async function updateCommunity(id: string, patch: Partial<Community>): Promise<Community> {
  const { data, error } = await supabase.from("communities").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
