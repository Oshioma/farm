import { supabase } from "@/lib/supabase";

export type Farm = {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  size_acres: number | null;
};

export type Zone = {
  id: string;
  farm_id: string;
  name: string;
  code: string | null;
  size_acres: number | null;
};

export type Crop = {
  id: string;
  crop_name: string;
  variety: string | null;
  status: string | null;
  planted_on: string | null;
  expected_harvest_start: string | null;
  expected_harvest_end: string | null;
  estimated_yield_kg: number | null;
  actual_yield_kg: number | null;
  expected_sale_price_per_kg: number | null;
  zone_id: string | null;
  zone: { name: string }[] | null;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  due_time: string | null;
  proof_required: boolean | null;
  zone_id: string | null;
  crop_id: string | null;
  crop: { crop_name: string }[] | null;
  zone: { name: string }[] | null;
};

export type Activity = {
  id: string;
  type: string;
  title: string;
  meta: string | null;
  created_at: string | null;
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  created_at: string | null;
  crop_id: string | null;
  zone_id: string | null;
  crop: { crop_name: string }[] | null;
  zone: { name: string }[] | null;
};

export type Asset = {
  id: string;
  name: string;
  category: string;
  purchase_date: string | null;
  purchase_price: number | null;
  paid_by: string | null;
  condition: string | null;
  notes: string | null;
  created_at: string | null;
};

export async function getFarms(): Promise<Farm[]> {
  const { data, error } = await supabase
    .from("farms")
    .select("id, name, slug, location, size_acres")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(`getFarms failed: ${error.message}`);
  return (data ?? []) as Farm[];
}

export async function getZones(farmId: string): Promise<Zone[]> {
  const { data, error } = await supabase
    .from("zones")
    .select("id, farm_id, name, code, size_acres")
    .eq("farm_id", farmId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(`getZones failed: ${error.message}`);
  return (data ?? []) as Zone[];
}

export async function getCrops(farmId: string): Promise<Crop[]> {
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
      zone_id,
      zone:zones(name)
    `
    )
    .eq("farm_id", farmId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getCrops failed: ${error.message}`);
  return (data ?? []) as Crop[];
}

export async function getTasks(farmId: string): Promise<Task[]> {
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
      zone_id,
      crop_id,
      crop:crops(crop_name),
      zone:zones(name)
    `
    )
    .eq("farm_id", farmId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(`getTasks failed: ${error.message}`);
  return (data ?? []) as Task[];
}

export async function getActivities(farmId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("id, type, title, meta, created_at")
    .eq("farm_id", farmId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(`getActivities failed: ${error.message}`);
  return (data ?? []) as Activity[];
}

export async function getExpenses(farmId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      id,
      category,
      amount,
      expense_date,
      created_at,
      crop_id,
      zone_id,
      crop:crops(crop_name),
      zone:zones(name)
    `
    )
    .eq("farm_id", farmId)
    .order("expense_date", { ascending: false })
    .limit(20);

  if (error) throw new Error(`getExpenses failed: ${error.message}`);
  return (data ?? []) as Expense[];
}

export async function getAssets(farmId: string): Promise<Asset[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("id, name, category, purchase_date, purchase_price, paid_by, condition, notes, created_at")
    .eq("farm_id", farmId)
    .order("purchase_date", { ascending: false });

  if (error) throw new Error(`getAssets failed: ${error.message}`);
  return (data ?? []) as Asset[];
}
