import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { farm_id } = await request.json();

    if (!farm_id || farm_id === "undefined" || farm_id === "null") {
      return Response.json(
        { error: "farm_id is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error: deleteLayoutError } = await supabase
      .from("farm_map_layouts")
      .delete()
      .eq("farm_id", farm_id);

    if (deleteLayoutError) {
      console.error("Error deleting farm_map_layouts row:", deleteLayoutError);
      return Response.json(
        { error: `Database error: ${deleteLayoutError.message}` },
        { status: 500 }
      );
    }

    // Archive all bed-synced zones for this farm so the dropdown matches
    // the fallback hardcoded layout (which the client will rebuild on the
    // next Save Layout).
    const { error: archiveError } = await supabase
      .from("zones")
      .update({ is_active: false })
      .eq("farm_id", farm_id)
      .eq("source", "bed-sync")
      .eq("is_active", true);

    if (archiveError) {
      console.error("Error archiving bed-sync zones on reset:", archiveError);
      return Response.json(
        { error: `Database error: ${archiveError.message}` },
        { status: 500 }
      );
    }

    return Response.json({ reset: true });
  } catch (error) {
    console.error("Error in reset-layout route:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
