import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { inviteState, loadInviteByToken, uniqueFarmSlug } from "@/lib/invites";
import type { InviteRow } from "@/lib/invites";
import { harvestMonthKeyFor, harvestSeasonYear } from "@/lib/harvest";

export const dynamic = "force-dynamic";

/* The no-login setup that a WhatsApp invite opens. Every request carries the
   invite token in the URL; that token is the only credential, so each action
   re-reads the invite row with the service role before writing anything. */

type Ctx = { params: Promise<{ token: string }> };

const invalid = () => NextResponse.json({ error: "This link is not valid." }, { status: 404 });

/** The email that stands in for a farmer who signed up by phone. */
function phoneEmail(phone: string) {
  return `wa-${phone}@farmers.shamba.online`;
}

/** Find or create the Supabase user behind an invite, remembering it on the row. */
async function ensureUser(admin: ReturnType<typeof getSupabaseAdmin>, invite: InviteRow): Promise<string> {
  if (invite.user_id) return invite.user_id;
  const email = phoneEmail(invite.phone);

  // Another invite for the same phone may already have made the account.
  const { data: earlier } = await admin
    .from("whatsapp_invites")
    .select("user_id")
    .eq("phone", invite.phone)
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle();
  let userId: string | null = earlier?.user_id ?? null;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID(),
      user_metadata: { full_name: invite.farmer_name, phone: invite.phone, signed_up_via: "whatsapp_invite" },
    });
    if (error && !/already/i.test(error.message)) throw error;
    userId = data?.user?.id ?? null;
  }
  if (!userId) {
    // The account exists from before invites were tracked: farm_members remembers emails.
    const { data: member } = await admin.from("farm_members").select("profile_id").eq("user_email", email).limit(1).maybeSingle();
    userId = member?.profile_id ?? null;
  }
  if (!userId) throw new Error("Could not create the farmer's account.");

  await admin.from("whatsapp_invites").update({ user_id: userId }).eq("id", invite.id);
  invite.user_id = userId;
  return userId;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const admin = getSupabaseAdmin();
  const invite = await loadInviteByToken(admin, token);
  if (!invite) return invalid();
  if (!invite.opened_at) await admin.from("whatsapp_invites").update({ opened_at: new Date().toISOString() }).eq("id", invite.id);
  return NextResponse.json(await inviteState(admin, invite));
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const admin = getSupabaseAdmin();
  const invite = await loadInviteByToken(admin, token);
  if (!invite) return invalid();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  try {
    if (action === "farm") {
      const name = String(body.name ?? "").trim().slice(0, 120);
      if (!name) return NextResponse.json({ error: "Farm name is required." }, { status: 400 });
      const userId = await ensureUser(admin, invite);
      if (invite.farm_id) {
        const { error } = await admin.from("farms").update({ name }).eq("id", invite.farm_id);
        if (error) throw error;
      } else {
        const slug = await uniqueFarmSlug(admin, name);
        const { data: farm, error } = await admin
          .from("farms")
          .insert({ name, slug, is_active: true, created_by: userId })
          .select("id")
          .single();
        if (error) throw error;
        const { error: memberError } = await admin.from("farm_members").insert({
          farm_id: farm.id,
          profile_id: userId,
          user_email: phoneEmail(invite.phone),
          role_on_farm: "owner",
        });
        if (memberError) throw memberError;
        invite.farm_id = farm.id;
      }
      const step = invite.step === "farm" ? "location" : invite.step;
      await admin.from("whatsapp_invites").update({ farm_id: invite.farm_id, step }).eq("id", invite.id);
      invite.step = step;
      return NextResponse.json(await inviteState(admin, invite));
    }

    if (!invite.farm_id) return NextResponse.json({ error: "Name the farm first." }, { status: 400 });

    if (action === "location") {
      const location = String(body.location ?? "").trim().slice(0, 200);
      if (!location) return NextResponse.json({ error: "Location is required." }, { status: 400 });
      const { error } = await admin.from("farms").update({ location }).eq("id", invite.farm_id);
      if (error) throw error;
      const step = invite.step === "location" ? "crop" : invite.step;
      await admin.from("whatsapp_invites").update({ step }).eq("id", invite.id);
      invite.step = step;
      return NextResponse.json(await inviteState(admin, invite));
    }

    if (action === "crop") {
      const cropName = String(body.name ?? "").trim().slice(0, 120);
      const variety = String(body.variety ?? "").trim().slice(0, 120);
      const harvestDate = String(body.harvestDate ?? "");
      const kg = Number(body.expectedKg);
      const price = body.pricePerKg === "" || body.pricePerKg == null ? null : Number(body.pricePerKg);
      if (!cropName || !/^\d{4}-\d{2}-\d{2}$/.test(harvestDate) || !Number.isFinite(kg) || kg <= 0) {
        return NextResponse.json({ error: "Crop name, harvest date and expected kilograms are required." }, { status: 400 });
      }
      const { data: crop, error } = await admin
        .from("crops")
        .insert({
          farm_id: invite.farm_id,
          crop_name: cropName,
          variety: variety || null,
          status: "planned",
          expected_harvest_start: harvestDate,
          estimated_yield_kg: kg,
          expected_sale_price_per_kg: price != null && Number.isFinite(price) ? price : null,
          is_active: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: harvestError } = await admin.from("harvest_eta").insert({
        farm_id: invite.farm_id,
        year: harvestSeasonYear(harvestDate),
        bed_name: variety ? `${cropName} · ${variety}` : cropName,
        crop_id: crop.id,
        main_crop: cropName,
        expected_harvest_date: harvestDate,
        [`${harvestMonthKeyFor(harvestDate)}_expected`]: String(kg),
      });
      if (harvestError) throw harvestError;
      await admin.from("activities").insert({ farm_id: invite.farm_id, type: "crop_created", title: `${cropName} added`, meta: "Crop created from WhatsApp setup" });
      return NextResponse.json(await inviteState(admin, invite));
    }

    if (action === "open") {
      const { count } = await admin.from("crops").select("id", { count: "exact", head: true }).eq("farm_id", invite.farm_id).eq("is_active", true);
      if (!count) return NextResponse.json({ error: "Add at least one crop before opening the shop." }, { status: 400 });
      const { error } = await admin.from("farms").update({ list_in_market: true }).eq("id", invite.farm_id);
      if (error) throw error;
      await admin.from("whatsapp_invites").update({ step: "done", completed_at: invite.completed_at ?? new Date().toISOString() }).eq("id", invite.id);
      invite.step = "done";
      return NextResponse.json(await inviteState(admin, invite));
    }

    if (action === "enter") {
      // A one-tap sign-in so the farmer can reach the dashboard without a password.
      const userId = await ensureUser(admin, invite);
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      const email = userData?.user?.email ?? phoneEmail(invite.phone);
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (error) throw error;
      const hashed = data.properties?.hashed_token;
      if (!hashed) throw new Error("Could not create a sign-in link.");
      const next = String(body.next ?? "/farm/prepare");
      const url = new URL("/auth/callback", req.nextUrl.origin);
      url.searchParams.set("token_hash", hashed);
      url.searchParams.set("type", "magiclink");
      url.searchParams.set("next", next.startsWith("/") ? next : "/farm/prepare");
      return NextResponse.json({ url: url.toString() });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error(`[start] action "${action}" failed for invite ${invite.id}:`, err);
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/* Supabase errors are objects with message/details/hint; not all are Error
   instances, so read the fields directly rather than trusting instanceof. */
function describeError(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const e = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [e.message, e.details, e.hint].filter((v): v is string => typeof v === "string" && v.length > 0);
    if (parts.length) return `${parts.join(" — ")}${typeof e.code === "string" ? ` (${e.code})` : ""}`;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
