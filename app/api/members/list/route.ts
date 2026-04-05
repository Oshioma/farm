import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    // Use admin client to fetch members (bypasses RLS)
    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch {
      // If admin client unavailable, fall back to user client
      admin = supabase;
    }

    const { data: members, error } = await admin
      .from("farm_members")
      .select("id, profile_id, user_email, role_on_farm, created_at")
      .eq("farm_id", farmId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich emails from Supabase Auth
    const emailMap: Record<string, string> = {};

    try {
      // Try listing all users with the admin API
      const { data: listData, error: listError } =
        await admin.auth.admin.listUsers({ perPage: 1000 });

      if (!listError && listData?.users) {
        const profileIds = new Set((members ?? []).map((m) => m.profile_id));
        for (const u of listData.users) {
          if (profileIds.has(u.id) && u.email) {
            emailMap[u.id] = u.email;
          }
        }
      }

      // Fallback: individual lookups for any members still missing
      const missing = (members ?? []).filter(
        (m) => !emailMap[m.profile_id] && !m.user_email
      );
      if (missing.length > 0) {
        await Promise.all(
          missing.map(async (m) => {
            try {
              const { data, error: err } = await admin.auth.admin.getUserById(
                m.profile_id
              );
              if (!err && data?.user?.email) {
                emailMap[m.profile_id] = data.user.email;
              }
            } catch {
              // skip
            }
          })
        );
      }
    } catch (e) {
      console.error("Auth email enrichment failed:", e);
    }

    // Backfill user_email in farm_members for any newly discovered emails
    const toUpdate = (members ?? []).filter(
      (m) => !m.user_email && emailMap[m.profile_id]
    );
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map((m) =>
          admin
            .from("farm_members")
            .update({ user_email: emailMap[m.profile_id] })
            .eq("id", m.id)
            .then(() => {})
        )
      );
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
