import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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

  // Fetch members for this farm using admin client
  const { data: members, error } = await supabaseAdmin
    .from("farm_members")
    .select("id, profile_id, user_email, role_on_farm, created_at")
    .eq("farm_id", farmId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Look up emails from auth for all members to ensure we have current emails
  const emailMap: Record<string, string> = {};

  try {
    await Promise.all(
      (members ?? []).map(async (m) => {
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(m.profile_id);
          if (data?.user?.email) {
            emailMap[m.profile_id] = data.user.email;
          }
        } catch {
          // skip if individual user lookup fails
        }
      })
    );
  } catch {
    // continue without auth emails if the lookup fails entirely
  }

  // Merge emails into member records
  const enriched = (members ?? []).map((m) => ({
    ...m,
    user_email: emailMap[m.profile_id] || m.user_email || null,
  }));

  return NextResponse.json({ members: enriched });
}
