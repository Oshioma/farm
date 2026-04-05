import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL");
    return NextResponse.json([], { status: 200 });
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("farms")
    .select("id, name")
    .order("name");

  if (error) {
    console.error("Failed to list farms:", error.message);
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data ?? []);
}
