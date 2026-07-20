import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const RESERVED = new Set(["new", "admin", "api", "join", "login", "signup", "settings"]);

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") ?? "").toLowerCase();

  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }

  if (RESERVED.has(slug)) {
    return NextResponse.json({ available: false, reason: "reserved" });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("communities").select("id").eq("slug", slug).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ available: !data });
}
