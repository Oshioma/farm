import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { farm_id, beds, landmarks, background_image } = await request.json();

    if (!farm_id) {
      return Response.json({ error: "farm_id is required" }, { status: 400 });
    }

    // Check if layout exists
    const { data: existing } = await supabase
      .from("farm_map_layouts")
      .select("id")
      .eq("farm_id", farm_id)
      .single();

    let result;
    if (existing) {
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
        { error: result.error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error in farm-map save route:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
