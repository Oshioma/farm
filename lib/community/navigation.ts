import { supabase } from "@/lib/supabase";
import type { NavigationItem } from "@/lib/community/types";

export async function getNavigation(communityId: string): Promise<NavigationItem[]> {
  const { data, error } = await supabase
    .from("navigation_items")
    .select("*")
    .eq("community_id", communityId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createNavigationItem(input: Omit<NavigationItem, "id" | "created_at">): Promise<NavigationItem> {
  const { data, error } = await supabase.from("navigation_items").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateNavigationItem(id: string, patch: Partial<NavigationItem>): Promise<NavigationItem> {
  const { data, error } = await supabase.from("navigation_items").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteNavigationItem(id: string): Promise<void> {
  const { error } = await supabase.from("navigation_items").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderNavigationItems(order: { id: string; sort_order: number; parent_id?: string | null }[]): Promise<void> {
  await Promise.all(
    order.map((item) => {
      const patch: Partial<NavigationItem> = { sort_order: item.sort_order };
      if (item.parent_id !== undefined) patch.parent_id = item.parent_id;
      return supabase.from("navigation_items").update(patch).eq("id", item.id);
    })
  );
}

export async function setNavStyle(
  communityId: string,
  navStyle: "sidebar" | "top" | "grouped_sidebar",
  navCollapsible: boolean
): Promise<void> {
  const { error } = await supabase
    .from("communities")
    .update({ nav_style: navStyle, nav_collapsible: navCollapsible })
    .eq("id", communityId);
  if (error) throw error;
}
