import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("farms")
    .select("id, name")
    .order("name");

  if (error) {
    console.error("Failed to list farms:", error.message);
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data ?? []);
}
