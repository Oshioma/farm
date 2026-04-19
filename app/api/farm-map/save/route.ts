import { getSupabaseAdmin } from "@/lib/supabase-admin";

type BedInput = {
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

function normalizeBed(raw: BedInput): BedInput {
  const id = String(raw.id ?? "").trim();
  const label = String(raw.label ?? raw.id ?? "").trim();
  return {
    ...raw,
    id,
    label: label || id,
    bed_uid: String(raw.bed_uid ?? "").trim() || randomBedUid(),
  };
}

export async function POST(request: Request) {
  try {
    const { farm_id, beds, landmarks, background_image } = await request.json();
    const parsedBeds = Array.isArray(beds) ? beds : [];
    const normalizedBeds = parsedBeds.map((b) => normalizeBed(b as BedInput));

    console.log("Farm map save request for farm_id:", farm_id, "with", normalizedBeds.length, "beds and", landmarks?.length, "landmarks");

    if (!farm_id) {
      console.error("farm_id is missing from request");
      return Response.json(
        { error: "farm_id is required" },
        { status: 400 }
      );
    }

    // Refuse to overwrite a saved layout with an empty beds array. Use the
    // dedicated /api/farm-map/reset-layout endpoint to explicitly clear a
    // layout — this guard protects against races where a farm switch leaves
    // stale state that would otherwise wipe the incoming farm's map.
    if (normalizedBeds.length === 0) {
      console.warn("Refusing to save empty beds for farm:", farm_id);
      return Response.json(
        { error: "Refusing to save an empty layout. Use /api/farm-map/reset-layout to clear intentionally." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

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
          beds: normalizedBeds,
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
          beds: normalizedBeds,
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

    // Keep zones in sync with beds as an internal data model.
    // This preserves existing foreign-key relationships across crops/tasks/etc.
    const { data: existingZones, error: zoneFetchError } = await supabase
      .from("zones")
      .select("id, name, code, bed_uid, source, is_active")
      .eq("farm_id", farm_id);

    if (zoneFetchError) {
      console.error("Error loading zones for bed sync:", zoneFetchError);
      return Response.json(
        { error: `Zone sync failed: ${zoneFetchError.message}` },
        { status: 500 }
      );
    }

    const zones = existingZones ?? [];
    type ZoneRow = (typeof zones)[number];
    const zoneByBedUid = new Map<string, ZoneRow>();
    const zoneByCode = new Map<string, ZoneRow>();
    const zoneByName = new Map<string, ZoneRow>();

    for (const zone of zones) {
      if (zone.bed_uid) {
        const existingByUid = zoneByBedUid.get(zone.bed_uid);
        if (!existingByUid || (!existingByUid.is_active && !!zone.is_active)) {
          zoneByBedUid.set(zone.bed_uid, zone);
        }
      }
      // Only match by code against active zones to avoid reviving stale
      // historical rows that happened to reuse a code in the past.
      if (zone.code && zone.is_active) {
        const existingByCode = zoneByCode.get(zone.code.toUpperCase());
        if (!existingByCode || !existingByCode.is_active) {
          zoneByCode.set(zone.code.toUpperCase(), zone);
        }
      }
      // Track by name (active or archived) so we can resurrect an archived
      // zone whose name collides with an incoming bed, instead of hitting
      // the (farm_id, name) unique constraint on insert.
      if (zone.name) {
        const existingByName = zoneByName.get(zone.name);
        if (!existingByName || (!existingByName.is_active && !!zone.is_active)) {
          zoneByName.set(zone.name, zone);
        }
      }
    }

    const activeBedUids = new Set<string>();
    const matchedZoneIds = new Set<string>();
    for (const bed of normalizedBeds) {
      const bedUid = bed.bed_uid!;
      activeBedUids.add(bedUid);
      const bedCode = (bed.id ?? bed.label ?? "").toUpperCase();
      const bedName = bed.label || bed.id || "Bed";
      const mapPosition = {
        x: bed.x ?? 0,
        y: bed.y ?? 0,
        w: bed.w ?? 0,
        h: bed.h ?? 0,
        ...(typeof bed.rotate === "number" ? { rotate: bed.rotate } : {}),
      };

      const matched =
        zoneByBedUid.get(bedUid) ||
        zoneByCode.get(bedCode) ||
        zoneByName.get(bedName);

      if (matched) {
        matchedZoneIds.add(matched.id);
        const { error: updateZoneError } = await supabase
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
        if (updateZoneError) {
          console.error("Error updating synced zone:", updateZoneError, {
            farm_id,
            zone_id: matched.id,
            bed_uid: bedUid,
          });
          return Response.json(
            { error: `Zone sync failed: ${updateZoneError.message}` },
            { status: 500 }
          );
        }
      } else {
        const { error: createZoneError } = await supabase
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
        if (createZoneError) {
          console.error("Error creating synced zone:", createZoneError, {
            farm_id,
            bed_uid: bedUid,
          });
          return Response.json(
            { error: `Zone sync failed: ${createZoneError.message}` },
            { status: 500 }
          );
        }
      }
    }

    // Archive any active zone (legacy or bed-sync) that isn't represented
    // by a bed in the saved layout. Zones are no longer managed in the UI,
    // so the map's beds are the source of truth.
    const orphanZoneIds = zones
      .filter((zone) => zone.is_active && !matchedZoneIds.has(zone.id))
      .map((zone) => zone.id);

    if (orphanZoneIds.length > 0) {
      const { error: archiveError } = await supabase
        .from("zones")
        .update({ is_active: false })
        .in("id", orphanZoneIds);
      if (archiveError) {
        console.error("Error archiving orphan zones:", archiveError, {
          farm_id,
          count: orphanZoneIds.length,
        });
        return Response.json(
          { error: `Zone sync failed: ${archiveError.message}` },
          { status: 500 }
        );
      }
    }

    console.log("Successfully saved layout for farm:", farm_id);
    return Response.json({ success: true, data: result.data, normalized_beds: normalizedBeds.length });
  } catch (error) {
    console.error("Error in farm-map save route:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
