import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { farm_id } = await req.json();
  if (!farm_id) return NextResponse.json({ error: "farm_id required" }, { status: 400 });

  const sb = getSupabaseAdmin();

  // Get all zone IDs for this farm
  const { data: zones } = await sb.from("zones").select("id").eq("farm_id", farm_id);
  const ids = (zones ?? []).map((z: { id: string }) => z.id);

  if (ids.length > 0) {
    // Delete linked data
    await sb.from("fertilisations").delete().in("zone_id", ids);
    await sb.from("compost").delete().in("zone_id", ids);
    await sb.from("mulch").delete().in("zone_id", ids);
    await sb.from("crops").update({ zone_id: null }).in("zone_id", ids);
    // Delete zones
    await sb.from("zones").delete().eq("farm_id", farm_id);
  }

  return NextResponse.json({ ok: true, deleted: ids.length });
}
