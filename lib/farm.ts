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
  amount: number | null;
  notes: string | null;
  vendor_name: string | null;
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: members, error: membersError } = await supabase
    .from("farm_members")
    .select("farm_id")
    .eq("profile_id", user.id);

  if (membersError) throw new Error(`getFarms failed: ${membersError.message}`);
  if (!members?.length) return [];

  const farmIds = members.map((m: { farm_id: string }) => m.farm_id);

  const { data, error } = await supabase
    .from("farms")
    .select("id, name, slug, location, size_acres")
    .in("id", farmIds)
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
      notes,
      vendor_name,
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

export type PlantingPlanEntry = {
  id: string;
  species_name: string;
  category: string;
  strata: string | null;
  role: string | null;
  seedlings_to_start: number | null;
  target_count: string | null;
  propagation_method: string | null;
  notes: string | null;
  sort_order: number;
};

export async function getPlantingPlan(farmId: string): Promise<PlantingPlanEntry[]> {
  const { data, error } = await supabase
    .from("planting_plan")
    .select("id, species_name, category, strata, role, seedlings_to_start, target_count, propagation_method, notes, sort_order")
    .eq("farm_id", farmId)
    .order("sort_order");

  if (error) throw new Error(`getPlantingPlan failed: ${error.message}`);
  return (data ?? []) as PlantingPlanEntry[];
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

export type Plant = {
  id: string;
  farm_id: string;
  name: string | null;
  image_url: string | null;
  notes: string | null;
  zone_id: string | null;
  created_at: string | null;
};

export async function getPlants(farmId: string): Promise<Plant[]> {
  const { data, error } = await supabase
    .from("plants")
    .select("id, farm_id, name, image_url, notes, zone_id, created_at")
    .eq("farm_id", farmId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getPlants failed: ${error.message}`);
  return (data ?? []) as Plant[];
}

export type TreeEntry = {
  id: string;
  farm_id: string;
  tree_name: string;
  number_of_trees: number | null;
  date_planted: string | null;
  notes: string | null;
  created_at: string | null;
};

export async function getTreeRegistry(farmId: string): Promise<TreeEntry[]> {
  const { data, error } = await supabase
    .from("tree_registry")
    .select("id, farm_id, tree_name, number_of_trees, date_planted, notes, created_at")
    .eq("farm_id", farmId)
    .order("date_planted", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`getTreeRegistry failed: ${error.message}`);
  return (data ?? []) as TreeEntry[];
}

export type Pest = {
  id: string;
  pest_name: string;
  severity: string;
  description: string | null;
  action_taken: string | null;
  logged_date: string;
  created_at: string | null;
  crop_id: string | null;
  zone_id: string | null;
  crop: { crop_name: string }[] | null;
  zone: { name: string }[] | null;
};

export async function getPests(farmId: string): Promise<Pest[]> {
  const { data, error } = await supabase
    .from("pest_logs")
    .select(
      `
      id,
      pest_name,
      severity,
      description,
      action_taken,
      logged_date,
      created_at,
      crop_id,
      zone_id,
      crop:crops(crop_name),
      zone:zones(name)
    `
    )
    .eq("farm_id", farmId)
    .order("logged_date", { ascending: false })
    .limit(30);

  if (error) throw new Error(`getPests failed: ${error.message}`);
  return (data ?? []) as Pest[];
}

export type SoilImprovement = {
  id: string;
  farm_id: string;
  date: string | null;
  bed: string | null;
  method: string | null;
  notes: string | null;
  created_at: string | null;
};

export async function getSoilImprovements(farmId: string): Promise<SoilImprovement[]> {
  const { data, error } = await supabase
    .from("soil_improvements")
    .select("id, farm_id, date, bed, method, notes, created_at")
    .eq("farm_id", farmId)
    .order("date", { ascending: true });

  if (error) throw new Error(`getSoilImprovements failed: ${error.message}`);
  return (data ?? []) as SoilImprovement[];
}

export type CompostEntry = {
  id: string;
  farm_id: string;
  compost_type: string | null;
  date: string | null;
  ready_to_use_date: string | null;
  materials_used: string | null;
  place: string | null;
  notes: string | null;
  created_at: string | null;
};

export async function getCompost(farmId: string): Promise<CompostEntry[]> {
  const { data, error } = await supabase
    .from("compost")
    .select("id, farm_id, compost_type, date, ready_to_use_date, materials_used, place, notes, created_at")
    .eq("farm_id", farmId)
    .order("date", { ascending: true });

  if (error) throw new Error(`getCompost failed: ${error.message}`);
  return (data ?? []) as CompostEntry[];
}

export type SeedCollectionEntry = {
  id: string;
  farm_id: string;
  plant: string;
  distance: string | null;
  notes: string | null;
  notes2: string | null;
  created_at: string | null;
};

export async function getSeedCollection(farmId: string): Promise<SeedCollectionEntry[]> {
  const { data, error } = await supabase
    .from("seed_collection")
    .select("id, farm_id, plant, distance, notes, notes2, created_at")
    .eq("farm_id", farmId)
    .order("plant");

  if (error) throw new Error(`getSeedCollection failed: ${error.message}`);
  return (data ?? []) as SeedCollectionEntry[];
}

export type FertilisationEntry = {
  id: string;
  farm_id: string;
  date: string | null;
  fertiliser: string | null;
  ready_to_use: string | null;
  bin_colour: string | null;
  plants: string | null;
  notes: string | null;
  created_at: string | null;
};

export async function getFertilisations(farmId: string): Promise<FertilisationEntry[]> {
  const { data, error } = await supabase
    .from("fertilisations")
    .select("id, farm_id, date, fertiliser, ready_to_use, bin_colour, plants, notes, created_at")
    .eq("farm_id", farmId)
    .order("date", { ascending: false });

  if (error) throw new Error(`getFertilisations failed: ${error.message}`);
  return (data ?? []) as FertilisationEntry[];
}

export type SeedlingEntry = {
  id: string;
  farm_id: string;
  type: string;
  date: string | null;
  plant: string;
  variety: string | null;
  quantity: string | null;
  germination: string | null;
  row_location: string | null;
  notes: string | null;
  created_at: string | null;
};

export async function getSeedlings(farmId: string): Promise<SeedlingEntry[]> {
  const { data, error } = await supabase
    .from("seedlings")
    .select("id, farm_id, type, date, plant, variety, quantity, germination, row_location, notes, created_at")
    .eq("farm_id", farmId)
    .order("date", { ascending: true });

  if (error) throw new Error(`getSeedlings failed: ${error.message}`);
  return (data ?? []) as SeedlingEntry[];
}
