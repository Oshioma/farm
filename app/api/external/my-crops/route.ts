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
// Identity note: farm_members.user_email is a lazily-backfilled cache that is
// frequently null (e.g. for farm owners), so it can't be the primary match key.
// The authoritative email lives in auth.users; we resolve email -> auth user id
// and match farm_members by profile_id (with user_email as a secondary fallback)
// — the same approach app/api/members/list uses.
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

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ crops: [] });
  }

  const supabase = getSupabaseAdmin();

  // 1) Resolve the email to an auth user id (case-insensitive).
  let userId: string | null = null;
  try {
    const { data: listData, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (!error) {
      userId = listData?.users?.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    }
  } catch (e) {
    console.error("my-crops: auth lookup failed", e);
  }

  // 2) Find the user's farms — primarily by membership (profile_id), with
  // user_email as a fallback for any rows that only carry the cached email.
  const farmIdSet = new Set<string>();

  if (userId) {
    const { data, error } = await supabase.from("farm_members").select("farm_id").eq("profile_id", userId);
    if (error) {
      console.error("my-crops: farm_members by profile_id failed", error.message);
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }
    for (const m of data ?? []) if (m.farm_id) farmIdSet.add(m.farm_id);
  }

  {
    const { data, error } = await supabase.from("farm_members").select("farm_id").ilike("user_email", email);
    if (error) {
      console.error("my-crops: farm_members by user_email failed", error.message);
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }
    for (const m of data ?? []) if (m.farm_id) farmIdSet.add(m.farm_id);
  }

  const farmIds = Array.from(farmIdSet);
  if (farmIds.length === 0) {
    console.info(`my-crops: no farms matched for ${email} (userId=${userId ?? "none"})`);
    return NextResponse.json({ crops: [] });
  }

  // 3) Active crops on those farms.
  const { data: crops, error: cropsError } = await supabase
    .from("crops")
    .select("id, crop_name, variety, status, planted_on, expected_harvest_start, expected_harvest_end, estimated_yield_kg, actual_yield_kg, image_url, farm_id")
    .in("farm_id", farmIds)
    .eq("is_active", true)
    .order("planted_on", { ascending: false });

  if (cropsError) {
    console.error("my-crops: crops lookup failed", cropsError.message);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  // 4) Farm names in a separate query (no dependency on a PostgREST FK embed).
  const { data: farms } = await supabase.from("farms").select("id, name").in("id", farmIds);
  const nameById = new Map((farms ?? []).map((f) => [f.id, f.name as string | null]));

  const shaped = (crops ?? []).map((c) => ({ ...c, farm_name: nameById.get(c.farm_id) ?? null }));
  console.info(`my-crops: ${email} -> ${farmIds.length} farm(s), ${shaped.length} active crop(s)`);
  return NextResponse.json({ crops: shaped });
}
