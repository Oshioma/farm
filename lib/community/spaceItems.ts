import { supabase } from "@/lib/supabase";
import type { SpaceComment, SpaceItem, SpaceItemType, SpaceReaction } from "@/lib/community/types";
import { recordTimelineEvent } from "@/lib/community/timeline";

export async function listSpaceItems(spaceId: string, itemType: SpaceItemType = "post"): Promise<SpaceItem[]> {
  const { data, error } = await supabase
    .from("space_items")
    .select("*")
    .eq("space_id", spaceId)
    .eq("item_type", itemType)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPost(
  communityId: string,
  spaceId: string,
  memberId: string,
  body: string,
  opts: { title?: string; images?: string[] } = {}
): Promise<SpaceItem> {
  const { title, images } = opts;
  const { data, error } = await supabase
    .from("space_items")
    .insert({
      space_id: spaceId,
      member_id: memberId,
      item_type: "post",
      title: title ?? null,
      body,
      data: images?.length ? { images } : {},
    })
    .select()
    .single();
  if (error) throw error;

  await recordTimelineEvent({
    communityId,
    memberId,
    spaceId,
    eventType: "post",
    refTable: "space_items",
    refId: data.id,
    title: title || body.slice(0, 80),
  });

  return data;
}

export async function updateSpaceItem(id: string, patch: Partial<Pick<SpaceItem, "title" | "body" | "data" | "pinned">>): Promise<SpaceItem> {
  const { data, error } = await supabase.from("space_items").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSpaceItem(id: string): Promise<void> {
  const { error } = await supabase.from("space_items").delete().eq("id", id);
  if (error) throw error;
}

export async function listComments(itemId: string): Promise<SpaceComment[]> {
  const { data, error } = await supabase.from("space_comments").select("*").eq("item_id", itemId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function addComment(itemId: string, memberId: string, body: string): Promise<SpaceComment> {
  const { data, error } = await supabase.from("space_comments").insert({ item_id: itemId, member_id: memberId, body }).select().single();
  if (error) throw error;
  return data;
}

export async function listReactions(itemId: string): Promise<SpaceReaction[]> {
  const { data, error } = await supabase.from("space_reactions").select("*").eq("item_id", itemId);
  if (error) throw error;
  return data ?? [];
}

export async function toggleReaction(itemId: string, memberId: string, reactionType = "like"): Promise<"added" | "removed"> {
  const { data: existing } = await supabase
    .from("space_reactions")
    .select("id")
    .eq("item_id", itemId)
    .eq("member_id", memberId)
    .eq("reaction_type", reactionType)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("space_reactions").delete().eq("id", existing.id);
    if (error) throw error;
    return "removed";
  }

  const { error } = await supabase.from("space_reactions").insert({ item_id: itemId, member_id: memberId, reaction_type: reactionType });
  if (error) throw error;
  return "added";
}
