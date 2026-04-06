import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { profileId } = await req.json();

    if (!profileId) {
      return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
    }

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

    // Prevent self-deletion
    if (profileId === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 });
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

    // Remove from all farms
    await admin.from("farm_members").delete().eq("profile_id", profileId);

    // Remove any join requests
    await admin.from("join_requests").delete().eq("user_id", profileId);

    // Delete the auth user
    const { error: authError } = await admin.auth.admin.deleteUser(profileId);

    if (authError) {
      return NextResponse.json(
        { error: "Removed from farms but failed to delete auth account: " + authError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin/delete-user error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
