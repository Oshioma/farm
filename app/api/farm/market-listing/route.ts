import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* Publishing a farm to the public market is a decision only its owner or a
   manager may take, so the flag is written here after checking membership
   rather than from the browser against RLS. */

export async function POST(req: NextRequest) {
  const { farmId, listed } = await req.json();
  if (!farmId || typeof listed !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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

  const { error } = await admin.from("farms").update({ list_in_market: listed }).eq("id", farmId);
  if (error) {
    if (/list_in_market/.test(error.message)) {
      return NextResponse.json(
        { error: "The market column is not on the database yet — run the pending migration first." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, listed });
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

  const { data, error } = await admin.from("farms").select("slug, list_in_market").eq("id", farmId).single();
  if (error) return NextResponse.json({ listed: false, available: false, slug: null });

  return NextResponse.json({ listed: !!data.list_in_market, available: true, slug: data.slug });
}
