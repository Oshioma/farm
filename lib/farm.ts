import { supabase } from "@/lib/supabase";

export async function getFarms() {
  const { data, error } = await supabase
    .from("farms")
    .select("id, name, slug, location, size_acres")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new Error(`getFarms failed: ${error.message}`);
  }

  return data ?? [];
}

export async function getFarmBySlug(slug: string) {
  const { data, error } = await supabase
    .from("farms")
    .select("id, name, slug, location, size_acres, notes")
    .eq("slug", slug)
    .single();

  if (error) {
    throw new Error(`getFarmBySlug failed: ${error.message}`);
  }

  return data;
}

export async function getCrops(farmId: string) {
  const { data, error } = await supabase
    .from("crops")
    .select(
      `
      id,
      crop_name,
      variety,
      status,
      planted_on,
      expected_harvest_start,
      expected_harvest_end,
      estimated_yield_kg,
      actual_yield_kg,
      expected_sale_price_per_kg,
      zone:zones(name)
    `
    )
    .eq("farm_id", farmId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`getCrops failed: ${error.message}`);
  }

  return data ?? [];
}

export async function getTasks(farmId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      id,
      title,
      description,
      status,
      priority,
      due_date,
      due_time,
      proof_required,
      crop:crops(crop_name),
      zone:zones(name)
    `
    )
    .eq("farm_id", farmId)
    .order("due_date", { ascending: true });

  if (error) {
    throw new Error(`getTasks failed: ${error.message}`);
  }

  return data ?? [];
}

export async function getActivities(farmId: string) {
  const { data, error } = await supabase
    .from("activities")
    .select("id, type, title, meta, created_at")
    .eq("farm_id", farmId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(`getActivities failed: ${error.message}`);
  }

  return data ?? [];
}
