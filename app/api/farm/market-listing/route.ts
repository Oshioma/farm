import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* Publishing a farm to the public market is a decision only its owner or a
   manager may take, so the flag is written here after checking membership
   rather than from the browser against RLS. */

export async function POST(req: NextRequest) {
  const { farmId, listed, heroUrl } = await req.json();
  const settingListing = typeof listed === "boolean";
  const settingHero = heroUrl === null || typeof heroUrl === "string";
  if (!farmId || (!settingListing && !settingHero)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (settingHero && typeof heroUrl === "string" && heroUrl && !/^https?:\/\//.test(heroUrl)) {
    return NextResponse.json({ error: "That image address does not look right" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: membership } = await admin
    .from("farm_members")
    .select("role_on_farm")
    .eq("profile_id", user.id)
    .eq("farm_id", farmId)
    .single();

  if (!membership || !["owner", "manager"].includes(membership.role_on_farm ?? "")) {
    return NextResponse.json({ error: "Only farm owners and managers can publish a farm" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (settingListing) patch.list_in_market = listed;
  if (settingHero) patch.shop_hero_url = heroUrl || null;

  const { error } = await admin.from("farms").update(patch).eq("id", farmId);
  if (error) {
    if (/list_in_market|shop_hero_url/.test(error.message)) {
      return NextResponse.json(
        { error: "The shop columns are not on the database yet — run the pending migration first." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, listed, heroUrl });
}

export async function GET(req: NextRequest) {
  const farmId = req.nextUrl.searchParams.get("farm_id");
  if (!farmId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: membership } = await admin
    .from("farm_members")
    .select("role_on_farm")
    .eq("profile_id", user.id)
    .eq("farm_id", farmId)
    .single();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await admin
    .from("farms")
    .select("slug, list_in_market, shop_hero_url")
    .eq("id", farmId)
    .single();
  if (error) return NextResponse.json({ listed: false, available: false, slug: null, heroUrl: null });

  return NextResponse.json({
    listed: !!data.list_in_market,
    available: true,
    slug: data.slug,
    heroUrl: data.shop_hero_url ?? null,
  });
}
