import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { inviteMessage, nudgeMessage, normalisePhone, pinMessage, whatsappLink } from "@/lib/whatsapp";
import type { InviteLang } from "@/lib/whatsapp";
import { linkSignsIn } from "@/lib/invites";
import type { InviteRow } from "@/lib/invites";
import { clearPin } from "@/lib/phone-accounts";

export const dynamic = "force-dynamic";

/* Only the super admin lists, creates or renews invites here; farmers can
   also start one themselves at /jisajili (source 'self'). The farmer never authenticates; the token in the link is
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
function present(origin: string, invite: InviteRow, farm: { name: string; slug: string; list_in_market: boolean | null } | null, hasPin: boolean) {
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
    source: invite.source ?? "admin",
    hasPin,
    linkActive: linkSignsIn(invite),
    signinUntil: invite.signin_until ?? null,
    farmName: farm?.name ?? null,
    shopLink,
    link,
    message: text,
    whatsapp: whatsappLink(invite.phone, text),
    pinMessage: pinMessage(invite.lang, vars),
    pinWhatsapp: whatsappLink(invite.phone, pinMessage(invite.lang, vars)),
  };
}

function failure(err: unknown) {
  console.error("[admin/invites] failed:", err);
  const e = (typeof err === "object" && err !== null ? err : {}) as { message?: unknown; details?: unknown };
  const message = [e.message, e.details].filter((v): v is string => typeof v === "string" && v.length > 0).join(" — ")
    || (err instanceof Error ? err.message : String(err));
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
  const pinned = new Set<string>();
  const phones = [...new Set(invites.map((row) => row.phone))];
  if (phones.length) {
    // Missing before the farmer_pins migration runs; then nobody shows a PIN.
    const { data: pinRows } = await admin.from("farmer_pins").select("phone").in("phone", phones);
    for (const row of pinRows ?? []) pinned.add(row.phone);
  }
  const origin = req.nextUrl.origin;
  return NextResponse.json({
    invites: invites.map((row) => present(origin, row, row.farm_id ? farms.get(row.farm_id) ?? null : null, pinned.has(row.phone))),
  });
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
  return NextResponse.json({ invite: present(req.nextUrl.origin, data as InviteRow, null, false) });
}

export async function PATCH(req: NextRequest) {
  try {
    return await renewInvite(req);
  } catch (err) {
    return failure(err);
  }
}

/* Give a farmer's link another 14 days of signing in, e.g. when they have
   forgotten their PIN. With resetPin the old PIN is removed too, so the link
   asks them to choose a new one. */
async function renewInvite(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Which invite?" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const signinUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("whatsapp_invites")
    .update({ signin_until: signinUntil })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const invite = data as InviteRow;
  if (body.resetPin) await clearPin(admin, invite.phone);

  let farm: { name: string; slug: string; list_in_market: boolean | null } | null = null;
  if (invite.farm_id) {
    const { data: farmRow } = await admin.from("farms").select("name, slug, list_in_market").eq("id", invite.farm_id).maybeSingle();
    farm = farmRow ?? null;
  }
  const { data: pinRow } = await admin.from("farmer_pins").select("phone").eq("phone", invite.phone).maybeSingle();
  return NextResponse.json({ invite: present(req.nextUrl.origin, invite, farm, !!pinRow) });
}
