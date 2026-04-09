import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const farm_id = searchParams.get("farm_id");

    console.log("Farm map load request for farm_id:", farm_id);

    if (!farm_id || farm_id === "undefined" || farm_id === "null") {
      console.error("Invalid farm_id:", farm_id);
      return Response.json(
        { error: "farm_id is required and must be a valid UUID" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("farm_map_layouts")
      .select("beds, landmarks, background_image")
      .eq("farm_id", farm_id)
      .single();

    if (error) {
      // PGRST116 = no rows found, which is fine (table might not have entry yet)
      if (error.code === "PGRST116") {
        console.log("No layout found for farm:", farm_id);
        return Response.json({ data: null });
      }
      console.error("Error loading farm map layout:", error);
      return Response.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      console.log("No data returned for farm:", farm_id);
      return Response.json({ data: null });
    }

    // Ensure beds and landmarks are arrays (not JSON strings)
    const beds = Array.isArray(data.beds) ? data.beds : (typeof data.beds === "string" ? JSON.parse(data.beds) : data.beds || []);
    const landmarks = Array.isArray(data.landmarks) ? data.landmarks : (typeof data.landmarks === "string" ? JSON.parse(data.landmarks) : data.landmarks || []);

    console.log("Successfully loaded layout for farm:", farm_id, "with", beds.length, "beds");
    return Response.json({ data: { beds, landmarks, background_image: data.background_image } });
  } catch (error) {
    console.error("Error in farm-map load route:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
