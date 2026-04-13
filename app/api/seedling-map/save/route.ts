import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { farm_id, zones, trays } = await request.json();

    console.log("Seedling map save request for farm_id:", farm_id, "with", zones?.length, "zones and", trays?.length, "trays");

    if (!farm_id) {
      console.error("farm_id is missing from request");
      return Response.json(
        { error: "farm_id is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if layout exists
    const { data: existing, error: checkError } = await supabase
      .from("seedling_map_layouts")
      .select("id")
      .eq("farm_id", farm_id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking for existing seedling layout:", checkError);
    }

    let result;
    if (existing) {
      console.log("Updating existing seedling layout for farm:", farm_id);
      result = await supabase
        .from("seedling_map_layouts")
        .update({
          zones,
          trays,
          updated_at: new Date().toISOString(),
        })
        .eq("farm_id", farm_id)
        .select();
    } else {
      console.log("Creating new seedling layout for farm:", farm_id);
      result = await supabase
        .from("seedling_map_layouts")
        .insert({
          farm_id,
          zones,
          trays,
        })
        .select();
    }

    if (result.error) {
      console.error("Error saving seedling map layout:", result.error);
      return Response.json(
        { error: `Database error: ${result.error.message}` },
        { status: 500 }
      );
    }

    console.log("Successfully saved seedling layout for farm:", farm_id);
    return Response.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error in seedling-map save route:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
