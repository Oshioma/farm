import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const farm_id = searchParams.get("farm_id");

    console.log("Seedling map load request for farm_id:", farm_id);

    if (!farm_id || farm_id === "undefined" || farm_id === "null") {
      console.error("Invalid farm_id:", farm_id);
      return Response.json(
        { error: "farm_id is required and must be a valid UUID" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("seedling_map_layouts")
      .select("zones, trays")
      .eq("farm_id", farm_id)
      .single();

    if (error) {
      // PGRST116 = no rows found, which is fine (table might not have entry yet)
      if (error.code === "PGRST116") {
        console.log("No seedling layout found for farm:", farm_id);
        return Response.json({ data: null });
      }
      console.error("Error loading seedling map layout:", error);
      return Response.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      console.log("No data returned for farm:", farm_id);
      return Response.json({ data: null });
    }

    // Ensure zones and trays are arrays (not JSON strings)
    const zones = Array.isArray(data.zones) ? data.zones : (typeof data.zones === "string" ? JSON.parse(data.zones) : data.zones || []);
    const trays = Array.isArray(data.trays) ? data.trays : (typeof data.trays === "string" ? JSON.parse(data.trays) : data.trays || []);

    console.log("Successfully loaded seedling layout for farm:", farm_id, "with", zones.length, "zones,", trays.length, "trays");
    return Response.json({ data: { zones, trays } });
  } catch (error) {
    console.error("Error in seedling-map load route:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
