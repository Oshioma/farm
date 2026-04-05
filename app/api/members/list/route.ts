import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const farmId = req.nextUrl.searchParams.get("farmId");
    if (!farmId) {
      return NextResponse.json({ error: "Missing farmId" }, { status: 400 });
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

    // Fetch members for this farm
    const { data: members, error } = await supabase
      .from("farm_members")
      .select("id, profile_id, user_email, role_on_farm, created_at")
      .eq("farm_id", farmId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Try to enrich emails from Supabase Auth admin API (requires service role key)
    const emailMap: Record<string, string> = {};
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const { createClient } = await import("@supabase/supabase-js");
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        );
        await Promise.all(
          (members ?? []).map(async (m) => {
            try {
              const { data } = await admin.auth.admin.getUserById(m.profile_id);
              if (data?.user?.email) {
                emailMap[m.profile_id] = data.user.email;
              }
            } catch {
              // skip individual lookup failures
            }
          })
        );
      }
    } catch {
      // continue without enriched emails
    }

    // Merge emails into member records
    const enriched = (members ?? []).map((m) => ({
      ...m,
      user_email: emailMap[m.profile_id] || m.user_email || null,
    }));

    return NextResponse.json({ members: enriched });
  } catch (err) {
    console.error("members/list error:", err);
    return NextResponse.json(
      { error: "Internal server error", members: [] },
      { status: 500 }
    );
  }
}
