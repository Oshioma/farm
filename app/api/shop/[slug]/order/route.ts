import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getShopData, monthIsOffered, monthLabel } from "@/lib/shop";

export const dynamic = "force-dynamic";

/* Pre-orders come from the public, so nothing in the request is trusted: the
   crop, the month and the amount are all re-checked against the farm's own
   harvest sheet before anything is written, and every order lands as
   "pending" for the farm to confirm. */

const MAX_ITEMS = 12;
const MAX_KG = 10_000;
const MAX_TEXT = 200;

type Item = { cropId: string; season: number; monthKey: string; sharePct?: number | null; quantityKg?: number | null };

function clean(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("Could not read that request.");
  }

  const name = clean(body.name);
  const contactName = clean(body.contactName);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 120).toLowerCase();
  const notes = clean(body.notes, 1000);
  const rawItems = Array.isArray(body.items) ? (body.items as Item[]) : [];

  if (!name) return bad("Please give a name we can put on the order.");
  if (!phone && !email) return bad("Please leave a telephone number or an email address so we can confirm.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("That email address does not look right.");
  if (rawItems.length === 0) return bad("Your pre-order is empty.");
  if (rawItems.length > MAX_ITEMS) return bad(`Please keep a single pre-order to ${MAX_ITEMS} items or fewer.`);

  const shop = await getShopData(slug);
  if (!shop) return bad("No such farm shop.", 404);

  /* Re-check every line against what the farm actually expects to harvest. */
  const rows: Record<string, unknown>[] = [];
  const summary: { crop: string; when: string; amount: string }[] = [];

  for (const item of rawItems) {
    const cropId = clean(item?.cropId, 64);
    const season = Number(item?.season);
    const monthKey = clean(item?.monthKey, 8);
    if (!cropId || !Number.isInteger(season) || !monthKey) return bad("That pre-order has a line we cannot read.");

    const month = monthIsOffered(shop.produce, cropId, season, monthKey);
    if (!month) return bad("One of those crops is no longer expected that month. Please refresh and try again.");

    const share = item?.sharePct === null || item?.sharePct === undefined ? null : Number(item.sharePct);
    const quantity = item?.quantityKg === null || item?.quantityKg === undefined ? null : Number(item.quantityKg);

    if (share === null && quantity === null) return bad("Each line needs a share or a weight.");
    if (share !== null && (!Number.isFinite(share) || share <= 0 || share > 100)) return bad("A share must be between 1 and 100%.");
    if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_KG)) return bad("That weight does not look right.");
    if (quantity !== null && month.availableKg !== null && quantity > month.availableKg) {
      return bad(`Only ${Math.floor(month.availableKg)} kg of ${monthLabel(season, monthKey)} is still unclaimed.`);
    }

    const crop = shop.produce.find((p) => p.cropId === cropId)!;
    rows.push({
      farm_id: shop.farm.id,
      crop_id: cropId,
      season,
      month_key: monthKey,
      share_pct: share,
      quantity_kg: quantity,
      price_per_kg: crop.pricePerKg,
      status: "pending",
      notes: notes || null,
    });
    summary.push({
      crop: crop.name + (crop.variety ? ` · ${crop.variety}` : ""),
      when: monthLabel(season, monthKey),
      amount: quantity !== null ? `${quantity} kg` : `${share}% of the harvest`,
    });
  }

  const admin = getSupabaseAdmin();

  /* One customer per person per farm: an email or telephone we already hold
     is the same customer placing another order, not a new one. */
  let customerId: string | null = null;
  try {
    const { data: existing } = await admin
      .from("customers")
      .select("id, email, phone")
      .eq("farm_id", shop.farm.id)
      .eq("is_active", true);
    const match = (existing ?? []).find(
      (c: { email: string | null; phone: string | null }) =>
        (email && (c.email ?? "").toLowerCase() === email) || (phone && (c.phone ?? "") === phone)
    ) as { id: string } | undefined;

    if (match) {
      customerId = match.id;
      await admin
        .from("customers")
        .update({
          name,
          contact_name: contactName || null,
          phone: phone || null,
          email: email || null,
        })
        .eq("id", customerId);
    } else {
      const { data: created, error: createErr } = await admin
        .from("customers")
        .insert({
          farm_id: shop.farm.id,
          name,
          contact_name: contactName || null,
          phone: phone || null,
          email: email || null,
        })
        .select("id")
        .single();
      if (createErr) throw createErr;
      customerId = created.id as string;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/relation .*customers.* does not exist/i.test(message)) {
      return bad("The shop is not quite ready to take orders. Please try again shortly.", 503);
    }
    return bad("We could not save your details. Please try again.", 500);
  }

  const { error: orderErr } = await admin
    .from("customer_orders")
    .insert(rows.map((r) => ({ ...r, customer_id: customerId })));
  if (orderErr) {
    return bad("We could not save your pre-order. Please try again.", 500);
  }

  await admin.from("activities").insert({
    farm_id: shop.farm.id,
    type: "order_created",
    title: `Pre-order from ${name}`,
    meta: `${rows.length} item${rows.length === 1 ? "" : "s"} from the shopfront`,
  });

  return NextResponse.json({ ok: true, summary, farm: shop.farm.name });
}
