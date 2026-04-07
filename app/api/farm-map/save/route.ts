import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { farm_id, beds, landmarks, background_image } = await request.json();

    console.log("Farm map save request for farm_id:", farm_id, "with", beds?.length, "beds and", landmarks?.length, "landmarks");

    if (!farm_id) {
      console.error("farm_id is missing from request");
      return Response.json(
        { error: "farm_id is required" },
        { status: 400 }
      );
    }

    // Check if layout exists
    const { data: existing, error: checkError } = await supabase
      .from("farm_map_layouts")
      .select("id")
      .eq("farm_id", farm_id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking for existing layout:", checkError);
    }

    let result;
    if (existing) {
      console.log("Updating existing layout for farm:", farm_id);
      // Update existing
      result = await supabase
        .from("farm_map_layouts")
        .update({
          beds,
          landmarks,
          background_image,
          updated_at: new Date().toISOString(),
        })
        .eq("farm_id", farm_id)
        .select();
    } else {
      console.log("Creating new layout for farm:", farm_id);
      // Insert new
      result = await supabase
        .from("farm_map_layouts")
        .insert({
          farm_id,
          beds,
          landmarks,
          background_image,
        })
        .select();
    }

    if (result.error) {
      console.error("Error saving farm map layout:", result.error);
      return Response.json(
        { error: `Database error: ${result.error.message}` },
        { status: 500 }
      );
    }

    console.log("Successfully saved layout for farm:", farm_id);
    return Response.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error in farm-map save route:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
