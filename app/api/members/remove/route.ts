import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { memberId, farmId } = await req.json();

  if (!memberId || !farmId) {
    return NextResponse.json({ error: "Missing memberId or farmId" }, { status: 400 });
  }

  // Authenticate the requesting user via their session cookies
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

  // Verify the requesting user is an owner of this farm
  const { data: callerMembership } = await supabaseAdmin
    .from("farm_members")
    .select("role_on_farm")
    .eq("profile_id", user.id)
    .eq("farm_id", farmId)
    .single();

  if (!callerMembership || callerMembership.role_on_farm !== "owner") {
    return NextResponse.json({ error: "Only farm owners can remove members" }, { status: 403 });
  }

  // Prevent removing yourself
  const { data: targetMember } = await supabaseAdmin
    .from("farm_members")
    .select("profile_id, role_on_farm")
    .eq("id", memberId)
    .eq("farm_id", farmId)
    .single();

  if (!targetMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (targetMember.role_on_farm === "owner") {
    return NextResponse.json({ error: "Cannot remove a farm owner" }, { status: 403 });
  }

  // Delete the member using admin client (bypasses RLS)
  const { error } = await supabaseAdmin
    .from("farm_members")
    .delete()
    .eq("id", memberId)
    .eq("farm_id", farmId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
