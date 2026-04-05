import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { profileId, farmId } = await req.json();

    if (!profileId || !farmId) {
      return NextResponse.json({ error: "Missing profileId or farmId" }, { status: 400 });
    }

    // Authenticate the requesting user
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

    // Verify caller is an owner of this farm
    const { data: callerMembership } = await admin
      .from("farm_members")
      .select("role_on_farm")
      .eq("profile_id", user.id)
      .eq("farm_id", farmId)
      .single();

    if (!callerMembership || callerMembership.role_on_farm !== "owner") {
      return NextResponse.json({ error: "Only farm owners can delete users" }, { status: 403 });
    }

    // Prevent deleting yourself
    if (profileId === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 });
    }

    // Check the target user's role — cannot delete owners
    const { data: targetMembership } = await admin
      .from("farm_members")
      .select("role_on_farm")
      .eq("profile_id", profileId)
      .eq("farm_id", farmId)
      .single();

    if (targetMembership?.role_on_farm === "owner") {
      return NextResponse.json({ error: "Cannot delete a farm owner" }, { status: 403 });
    }

    // Remove from all farms
    const { error: memberError } = await admin
      .from("farm_members")
      .delete()
      .eq("profile_id", profileId);

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // Remove any join requests
    await admin
      .from("join_requests")
      .delete()
      .eq("user_id", profileId);

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
    console.error("members/delete error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
