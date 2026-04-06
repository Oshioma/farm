import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Verify caller is an owner of at least one farm
    const { data: ownerCheck } = await admin
      .from("farm_members")
      .select("id")
      .eq("profile_id", user.id)
      .eq("role_on_farm", "owner")
      .limit(1);

    if (!ownerCheck || ownerCheck.length === 0) {
      return NextResponse.json({ error: "Only farm owners can access admin" }, { status: 403 });
    }

    // Fetch all farms
    const { data: farms, error: farmsError } = await admin
      .from("farms")
      .select("id, name, slug, location, size_acres, is_active, created_at")
      .order("created_at", { ascending: true });

    if (farmsError) {
      return NextResponse.json({ error: farmsError.message }, { status: 500 });
    }

    // Fetch all members
    const { data: members, error: membersError } = await admin
      .from("farm_members")
      .select("id, farm_id, profile_id, user_email, role_on_farm, created_at");

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Enrich emails from Supabase Auth
    const emailMap: Record<string, string> = {};
    try {
      const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (listData?.users) {
        for (const u of listData.users) {
          if (u.email) emailMap[u.id] = u.email;
        }
      }
    } catch {
      // skip enrichment
    }

    const enrichedMembers = (members ?? []).map((m) => ({
      ...m,
      user_email: emailMap[m.profile_id] || m.user_email || null,
    }));

    return NextResponse.json({ farms: farms ?? [], members: enrichedMembers, currentUserId: user.id });
  } catch (err) {
    console.error("admin/farms error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
