import { supabase } from "@/lib/supabase";
import type { JournalFieldDef, SpaceItem } from "@/lib/community/types";
import { recordTimelineEvent } from "@/lib/community/timeline";
import type { JournalFieldSuggestion } from "@/lib/community/catalog/journalSubjects";

export async function getJournalFields(spaceId: string): Promise<JournalFieldDef[]> {
  const { data, error } = await supabase.from("journal_field_defs").select("*").eq("space_id", spaceId).order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function seedJournalFields(spaceId: string, fields: JournalFieldSuggestion[]): Promise<void> {
  if (!fields.length) return;
  const { error } = await supabase.from("journal_field_defs").insert(
    fields.map((f, i) => ({
      space_id: spaceId,
      key: f.key,
      label: f.label,
      field_type: f.field_type,
      options: f.options ?? [],
      sort_order: i,
    }))
  );
  if (error) throw error;
}

export async function createJournalField(input: Omit<JournalFieldDef, "id" | "created_at">): Promise<JournalFieldDef> {
  const { data, error } = await supabase.from("journal_field_defs").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateJournalField(id: string, patch: Partial<JournalFieldDef>): Promise<JournalFieldDef> {
  const { data, error } = await supabase.from("journal_field_defs").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteJournalField(id: string): Promise<void> {
  const { error } = await supabase.from("journal_field_defs").delete().eq("id", id);
  if (error) throw error;
}

export async function listJournalEntries(spaceId: string, memberId?: string): Promise<SpaceItem[]> {
  let query = supabase
    .from("space_items")
    .select("*")
    .eq("space_id", spaceId)
    .eq("item_type", "journal_entry")
    .order("created_at", { ascending: false });
  if (memberId) query = query.eq("member_id", memberId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createJournalEntry(
  communityId: string,
  spaceId: string,
  memberId: string,
  values: Record<string, unknown>,
  opts: { title?: string } = {}
): Promise<SpaceItem> {
  const { data, error } = await supabase
    .from("space_items")
    .insert({
      space_id: spaceId,
      member_id: memberId,
      item_type: "journal_entry",
      title: opts.title ?? null,
      data: values,
    })
    .select()
    .single();
  if (error) throw error;

  await recordTimelineEvent({
    communityId,
    memberId,
    spaceId,
    eventType: "journal_entry",
    refTable: "space_items",
    refId: data.id,
    title: opts.title || "New journal entry",
    summary: null,
    data: values,
  });

  return data;
}
