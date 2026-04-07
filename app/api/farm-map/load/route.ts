import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const farm_id = searchParams.get("farm_id");

    if (!farm_id) {
      return Response.json({ error: "farm_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("farm_map_layouts")
      .select("beds, landmarks, background_image")
      .eq("farm_id", farm_id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is fine
      console.error("Error loading farm map layout:", error);
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      // No layout found, return null
      return Response.json({ data: null });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("Error in farm-map load route:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
