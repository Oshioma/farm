import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Read-only bridge for the Relate community platform (relate.click).
//
// Relate and this farm app are separate Supabase projects, so Relate does not
// hold this database's keys. Instead it calls this endpoint, authenticated with
// a shared secret, to show a member their own crops inside a Crop Guides space.
// The farm app stays the single source of truth for crops, reminders, tasks and
// harvests — this only exposes a read-only view of a given email's active crops.
//
// Setup: set RELATE_BRIDGE_SECRET here to a long random string, and set the same
// value as FARM_API_SECRET in Relate. Relate calls:
//   GET /api/external/my-crops?email=<email>
//   Authorization: Bearer <RELATE_BRIDGE_SECRET>
export async function GET(req: NextRequest) {
  const secret = process.env.RELATE_BRIDGE_SECRET;

  // Fail closed: if no secret is configured, the bridge is effectively off.
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get("email")?.trim();
  if (!email) {
    return NextResponse.json({ crops: [] });
  }

  const supabase = getSupabaseAdmin();

  // Which farms does this email belong to? (farm_members stores the email.)
  const { data: members, error: membersError } = await supabase
    .from("farm_members")
    .select("farm_id")
    .eq("user_email", email);

  if (membersError) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  const farmIds = (members ?? []).map((m) => m.farm_id).filter(Boolean);
  if (farmIds.length === 0) {
    return NextResponse.json({ crops: [] });
  }

  // Active crops on those farms, with the farm name for display.
  const { data: crops, error: cropsError } = await supabase
    .from("crops")
    .select(
      "id, crop_name, variety, status, planted_on, expected_harvest_start, expected_harvest_end, estimated_yield_kg, actual_yield_kg, image_url, farm_id, farms(name)"
    )
    .in("farm_id", farmIds)
    .eq("is_active", true)
    .order("planted_on", { ascending: false });

  if (cropsError) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  const shaped = (crops ?? []).map((c) => {
    const { farms, farm_id, ...rest } = c as typeof c & { farms: { name: string | null } | { name: string | null }[] | null };
    const farm = Array.isArray(farms) ? farms[0] : farms;
    return { ...rest, farm_name: farm?.name ?? null };
  });

  return NextResponse.json({ crops: shaped });
}
