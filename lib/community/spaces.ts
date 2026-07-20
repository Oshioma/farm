import { supabase } from "@/lib/supabase";
import type { Space, SpaceComponent } from "@/lib/community/types";
import { SPACE_TYPE_CATALOG } from "@/lib/community/catalog/spaceTypes";
import { slugify } from "@/lib/community/communities";

export async function getSpaces(communityId: string, opts: { includeHidden?: boolean } = {}): Promise<Space[]> {
  let query = supabase.from("spaces").select("*").eq("community_id", communityId).order("sort_order", { ascending: true });
  if (!opts.includeHidden) query = query.eq("is_hidden", false);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSpace(spaceId: string): Promise<Space | null> {
  const { data, error } = await supabase.from("spaces").select("*").eq("id", spaceId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSpaceBySlug(communityId: string, slug: string): Promise<Space | null> {
  const { data, error } = await supabase.from("spaces").select("*").eq("community_id", communityId).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}

async function uniqueSlug(communityId: string, base: string): Promise<string> {
  const root = slugify(base) || "space";
  const { data } = await supabase.from("spaces").select("slug").eq("community_id", communityId).like("slug", `${root}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

export async function createSpace(
  communityId: string,
  input: Pick<Space, "name" | "space_type"> & Partial<Pick<Space, "icon" | "description" | "visibility" | "group_label" | "settings">>
): Promise<Space> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const meta = SPACE_TYPE_CATALOG[input.space_type];
  const slug = await uniqueSlug(communityId, input.name);

  const { data: maxSort } = await supabase
    .from("spaces")
    .select("sort_order")
    .eq("community_id", communityId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("spaces")
    .insert({
      community_id: communityId,
      name: input.name,
      slug,
      icon: input.icon ?? meta.icon,
      description: input.description ?? null,
      visibility: input.visibility ?? "members",
      space_type: input.space_type,
      settings: input.settings ?? {},
      group_label: input.group_label ?? null,
      sort_order: (maxSort?.sort_order ?? -1) + 1,
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.from("space_components").insert(
    meta.defaultComponents.map((componentType, i) => ({
      space_id: data.id,
      component_type: componentType,
      sort_order: i,
    }))
  );

  return data;
}

export async function updateSpace(spaceId: string, patch: Partial<Space>): Promise<Space> {
  const { data, error } = await supabase.from("spaces").update(patch).eq("id", spaceId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSpace(spaceId: string): Promise<void> {
  const { error } = await supabase.from("spaces").delete().eq("id", spaceId);
  if (error) throw error;
}

export async function reorderSpaces(order: { id: string; sort_order: number }[]): Promise<void> {
  await Promise.all(order.map((s) => supabase.from("spaces").update({ sort_order: s.sort_order }).eq("id", s.id)));
}

export async function duplicateSpace(space: Space): Promise<Space> {
  const slug = await uniqueSlug(space.community_id, `${space.name}-copy`);
  const { data, error } = await supabase
    .from("spaces")
    .insert({
      community_id: space.community_id,
      name: `${space.name} (Copy)`,
      slug,
      icon: space.icon,
      description: space.description,
      visibility: space.visibility,
      space_type: space.space_type,
      settings: space.settings,
      group_label: space.group_label,
      sort_order: space.sort_order + 1,
    })
    .select()
    .single();
  if (error) throw error;

  const { data: components } = await supabase.from("space_components").select("*").eq("space_id", space.id);
  if (components?.length) {
    await supabase.from("space_components").insert(
      components.map((c: SpaceComponent) => ({
        space_id: data.id,
        component_type: c.component_type,
        config: c.config,
        sort_order: c.sort_order,
        is_enabled: c.is_enabled,
      }))
    );
  }

  return data;
}

export async function getSpaceComponents(spaceId: string): Promise<SpaceComponent[]> {
  const { data, error } = await supabase.from("space_components").select("*").eq("space_id", spaceId).order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function setSpaceComponentEnabled(componentId: string, isEnabled: boolean): Promise<void> {
  const { error } = await supabase.from("space_components").update({ is_enabled: isEnabled }).eq("id", componentId);
  if (error) throw error;
}
