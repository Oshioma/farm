import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// A member can be a worker or a manager. "owner" is the farm creator and is
// never changed through this endpoint.
const ALLOWED_ROLES = ["worker", "manager"];

export async function POST(req: NextRequest) {
  const { memberId, farmId, role } = await req.json();

  if (!memberId || !farmId || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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

  // Only a farm owner may change member roles.
  const { data: callerMembership } = await supabaseAdmin
    .from("farm_members")
    .select("role_on_farm")
    .eq("profile_id", user.id)
    .eq("farm_id", farmId)
    .single();

  if (!callerMembership || callerMembership.role_on_farm !== "owner") {
    return NextResponse.json(
      { error: "Only farm owners can change member roles" },
      { status: 403 }
    );
  }

  // Never change another owner's role.
  const { data: targetMember } = await supabaseAdmin
    .from("farm_members")
    .select("role_on_farm")
    .eq("id", memberId)
    .eq("farm_id", farmId)
    .single();

  if (!targetMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (targetMember.role_on_farm === "owner") {
    return NextResponse.json({ error: "Cannot change a farm owner's role" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("farm_members")
    .update({ role_on_farm: role })
    .eq("id", memberId)
    .eq("farm_id", farmId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
