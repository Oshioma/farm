import { getSupabaseAdmin } from "@/lib/supabase-admin";

type StoredBed = {
  id?: string;
  label?: string;
  bed_uid?: string;
};

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

    const { data: layout, error: layoutError } = await supabase
      .from("farm_map_layouts")
      .select("beds")
      .eq("farm_id", farm_id)
      .single();

    if (layoutError && layoutError.code !== "PGRST116") {
      console.error("Error loading layout for cleanup:", layoutError);
      return Response.json(
        { error: `Database error: ${layoutError.message}` },
        { status: 500 }
      );
    }

    const rawBeds = layout?.beds;
    const beds: StoredBed[] = Array.isArray(rawBeds)
      ? rawBeds
      : typeof rawBeds === "string"
        ? JSON.parse(rawBeds)
        : [];

    if (beds.length === 0) {
      return Response.json(
        { error: "No saved layout for this farm — refusing to archive every zone." },
        { status: 400 }
      );
    }

    const activeBedUids = new Set<string>();
    const activeBedCodes = new Set<string>();
    for (const bed of beds) {
      if (bed.bed_uid) activeBedUids.add(bed.bed_uid);
      const code = (bed.id ?? bed.label ?? "").toUpperCase();
      if (code) activeBedCodes.add(code);
    }

    const { data: zoneRows, error: zoneFetchError } = await supabase
      .from("zones")
      .select("id, name, code, bed_uid, source, is_active")
      .eq("farm_id", farm_id)
      .eq("is_active", true);

    if (zoneFetchError) {
      console.error("Error loading zones for cleanup:", zoneFetchError);
      return Response.json(
        { error: `Database error: ${zoneFetchError.message}` },
        { status: 500 }
      );
    }

    const orphans = (zoneRows ?? []).filter((zone) => {
      const uidMatches = zone.bed_uid && activeBedUids.has(zone.bed_uid);
      const codeMatches = zone.code && activeBedCodes.has(zone.code.toUpperCase());
      return !uidMatches && !codeMatches;
    });

    if (orphans.length === 0) {
      return Response.json({ archived: 0, names: [] });
    }

    const orphanIds = orphans.map((z) => z.id);
    const { error: archiveError } = await supabase
      .from("zones")
      .update({ is_active: false })
      .in("id", orphanIds);

    if (archiveError) {
      console.error("Error archiving orphan zones:", archiveError);
      return Response.json(
        { error: `Database error: ${archiveError.message}` },
        { status: 500 }
      );
    }

    return Response.json({
      archived: orphans.length,
      names: orphans.map((z) => z.name),
    });
  } catch (error) {
    console.error("Error in cleanup-orphan-zones route:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
