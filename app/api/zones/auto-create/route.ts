import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { farm_id, beds } = await req.json();
  if (!farm_id || !beds?.length) {
    return NextResponse.json({ error: "farm_id and beds required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // Get existing zones for this farm
  const { data: existing } = await sb
    .from("zones")
    .select("id, name, code")
    .eq("farm_id", farm_id)
    .eq("is_active", true);

  const existingNames = new Set((existing ?? []).map((z: { name: string }) => z.name.toUpperCase()));
  const existingCodes = new Set((existing ?? []).map((z: { code: string | null }) => (z.code ?? "").toUpperCase()));

  let created = 0;
  for (const bed of beds) {
    const bid = bed.id.toUpperCase();
    // Skip if a zone with this name or code already exists
    if (existingNames.has(bid) || existingCodes.has(bid)) continue;

    const pos = { x: bed.x, y: bed.y, w: bed.w, h: bed.h, ...(bed.rotate ? { rotate: bed.rotate } : {}) };
    const { error } = await sb.from("zones").insert({
      farm_id,
      name: bed.id,
      code: bed.id,
      is_active: true,
      map_position: pos,
    });
    if (!error) created++;
  }

  return NextResponse.json({ ok: true, created });
}
