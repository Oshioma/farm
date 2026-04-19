import { getSupabaseAdmin } from "@/lib/supabase-admin";

type StoredBed = {
  id?: string;
  label?: string;
  bed_uid?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotate?: number;
};

function randomBedUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `bed_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

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

    const { data: existingZones, error: zoneFetchError } = await supabase
      .from("zones")
      .select("id, name, code, bed_uid, source, is_active")
      .eq("farm_id", farm_id);

    if (zoneFetchError) {
      console.error("Error loading zones for cleanup:", zoneFetchError);
      return Response.json(
        { error: `Database error: ${zoneFetchError.message}` },
        { status: 500 }
      );
    }

    const zones = existingZones ?? [];
    type ZoneRow = (typeof zones)[number];

    const zoneByBedUid = new Map<string, ZoneRow>();
    const zoneByCode = new Map<string, ZoneRow>();
    for (const zone of zones) {
      if (zone.bed_uid) {
        const existingByUid = zoneByBedUid.get(zone.bed_uid);
        if (!existingByUid || (!existingByUid.is_active && !!zone.is_active)) {
          zoneByBedUid.set(zone.bed_uid, zone);
        }
      }
      if (zone.code && zone.is_active) {
        const existingByCode = zoneByCode.get(zone.code.toUpperCase());
        if (!existingByCode || !existingByCode.is_active) {
          zoneByCode.set(zone.code.toUpperCase(), zone);
        }
      }
    }

    const matchedZoneIds = new Set<string>();
    let created = 0;
    let updated = 0;

    for (const bed of beds) {
      const bedUid = bed.bed_uid || randomBedUid();
      const bedCode = (bed.id ?? bed.label ?? "").toUpperCase();
      const bedName = bed.label || bed.id || "Bed";
      const mapPosition = {
        x: bed.x ?? 0,
        y: bed.y ?? 0,
        w: bed.w ?? 0,
        h: bed.h ?? 0,
        ...(typeof bed.rotate === "number" ? { rotate: bed.rotate } : {}),
      };

      const matched = zoneByBedUid.get(bedUid) || zoneByCode.get(bedCode);
      if (matched) {
        matchedZoneIds.add(matched.id);
        const { error } = await supabase
          .from("zones")
          .update({
            name: bedName,
            code: bedCode || null,
            bed_uid: bedUid,
            source: "bed-sync",
            map_position: mapPosition,
            is_active: true,
          })
          .eq("id", matched.id);
        if (error) {
          console.error("Error updating zone during cleanup:", error);
          return Response.json(
            { error: `Zone sync failed: ${error.message}` },
            { status: 500 }
          );
        }
        updated += 1;
      } else {
        const { error } = await supabase
          .from("zones")
          .insert({
            farm_id,
            name: bedName,
            code: bedCode || null,
            bed_uid: bedUid,
            source: "bed-sync",
            map_position: mapPosition,
            is_active: true,
          });
        if (error) {
          console.error("Error creating zone during cleanup:", error);
          return Response.json(
            { error: `Zone sync failed: ${error.message}` },
            { status: 500 }
          );
        }
        created += 1;
      }
    }

    const orphans = zones.filter(
      (zone) => zone.is_active && !matchedZoneIds.has(zone.id)
    );

    if (orphans.length > 0) {
      const { error: archiveError } = await supabase
        .from("zones")
        .update({ is_active: false })
        .in("id", orphans.map((z) => z.id));
      if (archiveError) {
        console.error("Error archiving orphan zones:", archiveError);
        return Response.json(
          { error: `Database error: ${archiveError.message}` },
          { status: 500 }
        );
      }
    }

    return Response.json({
      archived: orphans.length,
      created,
      updated,
      archived_names: orphans.map((z) => z.name),
    });
  } catch (error) {
    console.error("Error in cleanup-orphan-zones route:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
