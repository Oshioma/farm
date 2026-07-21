import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// A member can be a worker or a manager. "owner" is the farm creator and is
// never changed through this endpoint.
const ALLOWED_ROLES = ["worker", "manager"];

export async function POST(request: Request) {
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

    // Only the super admin can access this endpoint.
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (!superAdminEmail || user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { memberId, role } = await request.json();
    if (!memberId || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Never change a farm owner's role through this endpoint.
    const { data: member, error: fetchError } = await admin
      .from("farm_members")
      .select("id, role_on_farm")
      .eq("id", memberId)
      .single();

    if (fetchError || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (member.role_on_farm === "owner") {
      return NextResponse.json(
        { error: "The farm owner's role cannot be changed here." },
        { status: 400 }
      );
    }

    const { error: updateError } = await admin
      .from("farm_members")
      .update({ role_on_farm: role })
      .eq("id", memberId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to set role" },
      { status: 500 }
    );
  }
}
