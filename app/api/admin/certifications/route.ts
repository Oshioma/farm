import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!superAdminEmail || user.email !== superAdminEmail) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { admin: getSupabaseAdmin() };
}

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { data, error } = await auth.admin!
      .from("farms")
      .select("id, name, slug, location, growing_practice, practice_notes, certification_body, certification_reference, certification_url, certification_expires_on, certification_verified_at, is_active")
      .or("certification_body.not.is.null,certification_reference.not.is.null,certification_url.not.is.null")
      .order("name");

    if (error) {
      if (/growing_practice|certification_/.test(error.message)) {
        return NextResponse.json({ error: "Run the growing-practice migration first." }, { status: 503 });
      }
      throw error;
    }

    return NextResponse.json({ farms: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load certifications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();
    const farmId = typeof body.farmId === "string" ? body.farmId : "";
    const action = body.action;
    if (!farmId || !["verify", "reset"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const admin = auth.admin!;
    if (action === "verify") {
      const { data: farm, error: readError } = await admin
        .from("farms")
        .select("certification_body, certification_reference, certification_url, certification_expires_on")
        .eq("id", farmId)
        .single();
      if (readError) throw readError;
      if (!farm.certification_body || !farm.certification_reference || !farm.certification_url) {
        return NextResponse.json({ error: "The farm must provide an organisation, reference and evidence link before verification." }, { status: 400 });
      }
      if (farm.certification_expires_on && farm.certification_expires_on < new Date().toISOString().slice(0, 10)) {
        return NextResponse.json({ error: "This certification has expired." }, { status: 400 });
      }
    }

    const { error } = await admin
      .from("farms")
      .update({ certification_verified_at: action === "verify" ? new Date().toISOString() : null })
      .eq("id", farmId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update certification" }, { status: 500 });
  }
}
