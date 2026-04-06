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

    // Only the super admin can access this endpoint
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (!superAdminEmail || user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();

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

    // Fetch all auth users to enrich emails and find orphaned users
    const memberProfileIds = new Set((members ?? []).map((m) => m.profile_id));
    const emailMap: Record<string, string> = {};
    const orphanedUsers: { id: string; email: string | undefined; created_at: string }[] = [];
    try {
      const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (listData?.users) {
        for (const u of listData.users) {
          if (u.email) emailMap[u.id] = u.email;
          if (!memberProfileIds.has(u.id)) {
            orphanedUsers.push({ id: u.id, email: u.email, created_at: u.created_at });
          }
        }
      }
    } catch {
      // skip enrichment
    }

    const enrichedMembers = (members ?? []).map((m) => ({
      ...m,
      user_email: emailMap[m.profile_id] || m.user_email || null,
    }));

    return NextResponse.json({
      farms: farms ?? [],
      members: enrichedMembers,
      orphanedUsers,
      currentUserId: user.id,
    });
  } catch (err) {
    console.error("admin/farms error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
