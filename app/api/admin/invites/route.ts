import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { inviteMessage, nudgeMessage, normalisePhone, whatsappLink } from "@/lib/whatsapp";
import type { InviteLang } from "@/lib/whatsapp";
import type { InviteRow } from "@/lib/invites";

export const dynamic = "force-dynamic";

/* WhatsApp invites are an admin tool for now: only the super admin lists or
   creates them. The farmer never authenticates; the token in the link is
   their credential, checked by /api/start/[token]. */

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail || user.email !== superAdminEmail) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

function startLink(origin: string, token: string) {
  return `${origin}/start/${token}`;
}

/** One invite as the admin page shows it, with the message ready to send. */
function present(origin: string, invite: InviteRow, farm: { name: string; slug: string; list_in_market: boolean | null } | null) {
  const link = startLink(origin, invite.token);
  const shopLink = farm?.slug ? `${origin}/${farm.slug}` : null;
  const vars = { name: invite.farmer_name, link, farm: farm?.name ?? null, shopLink };
  const text = invite.step === "farm" && !invite.opened_at
    ? inviteMessage(invite.lang, vars)
    : nudgeMessage(invite.lang, invite.step, vars);
  return {
    id: invite.id,
    farmerName: invite.farmer_name,
    phone: invite.phone,
    lang: invite.lang,
    step: invite.step,
    createdAt: invite.created_at,
    openedAt: invite.opened_at,
    completedAt: invite.completed_at,
    farmName: farm?.name ?? null,
    shopLink,
    link,
    message: text,
    whatsapp: whatsappLink(invite.phone, text),
  };
}

function failure(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: `Invites are not available: ${message}` }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    return await listInvites(req);
  } catch (err) {
    return failure(err);
  }
}

async function listInvites(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("whatsapp_invites")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    if (/whatsapp_invites/.test(error.message)) {
      return NextResponse.json({ error: "The invites table is not on the database yet — the migration has not run." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const invites = (data ?? []) as InviteRow[];
  const farmIds = invites.map((row) => row.farm_id).filter((id): id is string => !!id);
  const farms = new Map<string, { name: string; slug: string; list_in_market: boolean | null }>();
  if (farmIds.length) {
    const { data: farmRows } = await admin.from("farms").select("id, name, slug, list_in_market").in("id", farmIds);
    for (const row of farmRows ?? []) farms.set(row.id, { name: row.name, slug: row.slug, list_in_market: row.list_in_market });
  }
  const origin = req.nextUrl.origin;
  return NextResponse.json({ invites: invites.map((row) => present(origin, row, row.farm_id ? farms.get(row.farm_id) ?? null : null)) });
}

export async function POST(req: NextRequest) {
  try {
    return await createInvite(req);
  } catch (err) {
    return failure(err);
  }
}

async function createInvite(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const body = await req.json().catch(() => ({}));
  const farmerName = String(body.farmerName ?? "").trim().slice(0, 120);
  const phone = normalisePhone(String(body.phone ?? ""));
  const lang: InviteLang = body.lang === "en" ? "en" : "sw";
  if (!farmerName) return NextResponse.json({ error: "The farmer's name is required." }, { status: 400 });
  if (phone.length < 9) return NextResponse.json({ error: "Enter a phone number with the country code, e.g. 0712 345 678 or +255 712 345 678." }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("whatsapp_invites")
    .insert({ farmer_name: farmerName, phone, lang, created_by: gate.user.id })
    .select("*")
    .single();
  if (error) {
    if (/whatsapp_invites/.test(error.message)) {
      return NextResponse.json({ error: "The invites table is not on the database yet — the migration has not run." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invite: present(req.nextUrl.origin, data as InviteRow, null) });
}
