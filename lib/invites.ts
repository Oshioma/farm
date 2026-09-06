import type { SupabaseClient } from "@supabase/supabase-js";
import type { InviteLang, InviteStep } from "@/lib/whatsapp";

export type InviteRow = {
  id: string;
  token: string;
  farmer_name: string;
  phone: string;
  lang: InviteLang;
  step: InviteStep;
  user_id: string | null;
  farm_id: string | null;
  created_by: string | null;
  created_at: string;
  opened_at: string | null;
  completed_at: string | null;
};

/** The token is the credential: validate its shape before touching the database. */
export function isInviteToken(token: string): boolean {
  return /^[a-f0-9]{16,}$/i.test(token);
}

export async function loadInviteByToken(admin: SupabaseClient, token: string): Promise<InviteRow | null> {
  if (!isInviteToken(token)) return null;
  const { data } = await admin.from("whatsapp_invites").select("*").eq("token", token).maybeSingle();
  return (data as InviteRow | null) ?? null;
}

/** Public shape handed to the browser: never the id, never the phone. */
export type InviteState = {
  token: string;
  farmerName: string;
  lang: InviteLang;
  step: InviteStep;
  farm: { id: string; name: string; slug: string; location: string | null; listed: boolean } | null;
  crops: { id: string; name: string; variety: string | null; harvestDate: string | null; expectedKg: number | null; pricePerKg: number | null }[];
};

export async function inviteState(admin: SupabaseClient, invite: InviteRow): Promise<InviteState> {
  let farm: InviteState["farm"] = null;
  let crops: InviteState["crops"] = [];
  if (invite.farm_id) {
    const { data: farmRow } = await admin
      .from("farms")
      .select("id, name, slug, location, list_in_market")
      .eq("id", invite.farm_id)
      .maybeSingle();
    if (farmRow) {
      farm = { id: farmRow.id, name: farmRow.name, slug: farmRow.slug, location: farmRow.location ?? null, listed: !!farmRow.list_in_market };
      const { data: cropRows } = await admin
        .from("crops")
        .select("id, crop_name, variety, expected_harvest_start, estimated_yield_kg, expected_sale_price_per_kg")
        .eq("farm_id", invite.farm_id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      crops = (cropRows ?? []).map((row) => ({
        id: row.id,
        name: row.crop_name,
        variety: row.variety ?? null,
        harvestDate: row.expected_harvest_start ?? null,
        expectedKg: row.estimated_yield_kg ?? null,
        pricePerKg: row.expected_sale_price_per_kg ?? null,
      }));
    }
  }
  return { token: invite.token, farmerName: invite.farmer_name, lang: invite.lang, step: invite.step, farm, crops };
}

/** A URL-safe slug that no other farm uses, mirroring create_farm_with_owner(). */
export async function uniqueFarmSlug(admin: SupabaseClient, name: string): Promise<string> {
  const base = (name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "farm").slice(0, 54);
  let slug = base;
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data } = await admin.from("farms").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}
