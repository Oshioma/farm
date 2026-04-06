import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { farmId } = await req.json();

    if (!farmId) {
      return NextResponse.json({ error: "Missing farmId" }, { status: 400 });
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

    // Only the super admin can access this endpoint
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (!superAdminEmail || user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();

    // Remove all members from this farm
    const { error: membersError } = await admin
      .from("farm_members")
      .delete()
      .eq("farm_id", farmId);

    if (membersError) {
      return NextResponse.json({ error: "Failed to remove members: " + membersError.message }, { status: 500 });
    }

    // Remove join requests for this farm
    await admin.from("join_requests").delete().eq("farm_id", farmId);

    // Delete the farm
    const { error: farmError } = await admin
      .from("farms")
      .delete()
      .eq("id", farmId);

    if (farmError) {
      return NextResponse.json({ error: "Failed to delete farm: " + farmError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin/delete-farm error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
