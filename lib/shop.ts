import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  HARVEST_MONTHS,
  seasonMonths,
  harvestSeasonYear,
  harvestMonthKeyFor,
  parseYieldKg,
  orderKg,
} from "@/lib/harvest";
import type { HarvestMonthKey, SeasonMonth } from "@/lib/harvest";
import { filledCropDetails } from "@/lib/cropDetails";

/* The public shopfront. Visitors are not farm members, so every read here goes
   through the service role and returns only what a shop should show: what is
   coming, when, and how much of it is still unclaimed. No customer is ever
   named, and nothing but produce leaves this module. */

export const SHOP_SEASON_SPAN = 2;

export type ShopMonth = {
  season: number;
  key: HarvestMonthKey;
  label: string;
  calendarYear: number;
  /** What the sheet says, verbatim — "40kg", "20 crates". */
  expectedText: string;
  /** Null when the sheet's text is not a weight. */
  expectedKg: number | null;
  committedKg: number;
  availableKg: number | null;
};

export type ShopProduce = {
  cropId: string;
  name: string;
  variety: string | null;
  beds: string;
  notes: string | null;
  /** The produce picture, or the plant where no produce picture exists. */
  imageUrl: string | null;
  pricePerKg: number | null;
  /** Flavour, appearance, size and so on — only what the farm filled in. */
  details: { label: string; value: string }[];
  months: ShopMonth[];
  totalExpectedKg: number;
  totalAvailableKg: number;
};

export type GrowingPractice = "unspecified" | "organic_practices" | "regenerative" | "conventional";

export type ShopData = {
  farm: {
    id: string;
    name: string;
    slug: string;
    location: string | null;
    heroUrl: string | null;
    contactPhone: string | null;
    fulfilmentMethod: "collection" | "delivery" | "both";
    collectionInstructions: string | null;
    deliveryArea: string | null;
    growingPractice: GrowingPractice;
    practiceNotes: string | null;
    certificationBody: string | null;
    certificationReference: string | null;
    certificationUrl: string | null;
    certificationExpiresOn: string | null;
    certificationVerifiedAt: string | null;
  };
  months: { season: number; key: HarvestMonthKey; label: string; calendarYear: number; expectedKg: number; crops: number }[];
  produce: ShopProduce[];
  currentMonth: { season: number; key: HarvestMonthKey } | null;
};

/** "top land", "Top-Land" and "topland" all address the same farm. */
function slugKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/* Nothing is public until a farm opts in. If the column is not on the database
   yet we publish nobody rather than everybody — a farm that never agreed to be
   listed must not be exposed by a migration that has not run. */
async function listedFarms() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("farms")
    .select("id, name, slug, location, shop_hero_url, shop_contact_phone, fulfilment_method, collection_instructions, delivery_area, growing_practice, practice_notes, certification_body, certification_reference, certification_url, certification_expires_on, certification_verified_at")
    .eq("is_active", true)
    .eq("list_in_market", true);
  if (error) {
    if (/list_in_market/.test(error.message)) return { farms: [], available: false };
    throw new Error(`findShopFarm failed: ${error.message}`);
  }
  return {
    farms: (data ?? []) as {
      id: string; name: string; slug: string | null; location: string | null; shop_hero_url?: string | null;
      shop_contact_phone?: string | null; fulfilment_method?: "collection" | "delivery" | "both" | null;
      collection_instructions?: string | null; delivery_area?: string | null;
      growing_practice?: GrowingPractice | null; practice_notes?: string | null; certification_body?: string | null;
      certification_reference?: string | null; certification_url?: string | null; certification_expires_on?: string | null;
      certification_verified_at?: string | null;
    }[],
    available: true,
  };
}

export async function findShopFarm(slug: string) {
  /* /shop is the market itself, never a farm. */
  if (slugKey(slug) === "shop") return null;

  const { farms: data } = await listedFarms();
  const wanted = slugKey(slug);
  const farms = data;
  const match =
    farms.find((f) => f.slug && slugKey(f.slug) === wanted) ??
    farms.find((f) => slugKey(f.name) === wanted) ??
    null;
  return match
    ? {
        id: match.id,
        name: match.name,
        slug: match.slug ?? slug,
        location: match.location,
        heroUrl: match.shop_hero_url ?? null,
        contactPhone: match.shop_contact_phone ?? null,
        fulfilmentMethod: match.fulfilment_method ?? "collection",
        collectionInstructions: match.collection_instructions ?? null,
        deliveryArea: match.delivery_area ?? null,
        growingPractice: match.growing_practice ?? "unspecified",
        practiceNotes: match.practice_notes ?? null,
        certificationBody: match.certification_body ?? null,
        certificationReference: match.certification_reference ?? null,
        certificationUrl: match.certification_url ?? null,
        certificationExpiresOn: match.certification_expires_on ?? null,
        certificationVerifiedAt: match.certification_verified_at ?? null,
      }
    : null;
}

/**
 * Everything the shopfront lists. A crop only appears once the harvest ETA
 * sheet expects something from it — nothing is offered on a maybe.
 */
export async function getShopData(slug: string): Promise<ShopData | null> {
  const farm = await findShopFarm(slug);
  if (!farm) return null;

  const admin = getSupabaseAdmin();
  const startSeason = harvestSeasonYear();
  const seasons = Array.from({ length: SHOP_SEASON_SPAN }, (_, i) => startSeason + i);
  const window = seasonMonths(startSeason, SHOP_SEASON_SPAN);

  const [{ data: etaRows, error: etaErr }, { data: cropRows, error: cropErr }, { data: zoneRows, error: zoneErr }] =
    await Promise.all([
      admin.from("harvest_eta").select("*").eq("farm_id", farm.id).in("year", seasons),
      admin
        .from("crops")
        /* Selected with * so a database without the descriptive columns still
           serves the shop; those details just come back empty. */
        .select("*")
        .eq("farm_id", farm.id)
        .eq("is_active", true),
      admin.from("zones").select("id, name, code").eq("farm_id", farm.id).eq("is_active", true),
    ]);
  if (etaErr) throw new Error(`getShopData failed: ${etaErr.message}`);
  if (cropErr) throw new Error(`getShopData failed: ${cropErr.message}`);
  if (zoneErr) throw new Error(`getShopData failed: ${zoneErr.message}`);

  const zones = (zoneRows ?? []) as { id: string; name: string; code: string | null }[];
  const entries = (etaRows ?? []) as Record<string, unknown>[];

  /* Orders are read only to work out how much is left, never to expose who
     holds what. A missing table (the migration has not run) just means
     nothing is committed yet. */
  const orders = await loadCommitments(farm.id);

  const bedsFor = (zoneId: string | null, extra: string | null): string => {
    const ids: string[] = [];
    if (zoneId) ids.push(zoneId);
    if (extra) {
      try {
        for (const id of JSON.parse(extra) as string[]) if (id && !ids.includes(id)) ids.push(id);
      } catch { /* ignore bad JSON */ }
    }
    return ids
      .map((id) => {
        const z = zones.find((zn) => zn.id === id);
        return z ? z.code?.trim() || z.name : "";
      })
      .filter(Boolean)
      .join(", ");
  };

  const produce: ShopProduce[] = [];
  for (const crop of (cropRows ?? []) as Record<string, unknown>[]) {
    const cropId = crop.id as string;
    const months: ShopMonth[] = [];

    for (const m of window) {
      const row = entries.find((e) => e.crop_id === cropId && e.year === m.season);
      const text = (((row?.[`${m.key}_expected`] as string | null) ?? "")).trim();
      if (!text) continue;

      const expectedKg = parseYieldKg(text).kg;
      const committedKg = committedFor(orders, cropId, m, expectedKg);
      months.push({
        season: m.season,
        key: m.key,
        label: m.label,
        calendarYear: m.calendarYear,
        expectedText: text,
        expectedKg,
        committedKg,
        availableKg: expectedKg === null ? null : Math.max(0, expectedKg - committedKg),
      });
    }

    if (months.length === 0) continue;  // nothing expected — not for sale

    produce.push({
      cropId,
      name: crop.crop_name as string,
      variety: (crop.variety as string | null) ?? null,
      beds: bedsFor((crop.zone_id as string | null) ?? null, (crop.extra_zone_ids as string | null) ?? null),
      notes: (crop.notes as string | null) ?? null,
      imageUrl:
        ((crop.produce_image_url as string | null) ?? null) || ((crop.image_url as string | null) ?? null),
      details: filledCropDetails(crop),
      pricePerKg: (crop.expected_sale_price_per_kg as number | null) ?? null,
      months,
      totalExpectedKg: months.reduce((sum, m) => sum + (m.expectedKg ?? 0), 0),
      totalAvailableKg: months.reduce((sum, m) => sum + (m.availableKg ?? 0), 0),
    });
  }

  produce.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const monthTotals = window.map((m) => {
    const listed = produce.filter((p) => p.months.some((pm) => pm.season === m.season && pm.key === m.key));
    return {
      season: m.season,
      key: m.key,
      label: m.label,
      calendarYear: m.calendarYear,
      expectedKg: listed.reduce((sum, p) => {
        const pm = p.months.find((x) => x.season === m.season && x.key === m.key);
        return sum + (pm?.expectedKg ?? 0);
      }, 0),
      crops: listed.length,
    };
  });

  return {
    farm: {
      id: farm.id,
      name: farm.name,
      slug: farm.slug,
      location: farm.location,
      heroUrl: farm.heroUrl,
      contactPhone: farm.contactPhone,
      fulfilmentMethod: farm.fulfilmentMethod,
      collectionInstructions: farm.collectionInstructions,
      deliveryArea: farm.deliveryArea,
      growingPractice: farm.growingPractice,
      practiceNotes: farm.practiceNotes,
      certificationBody: farm.certificationBody,
      certificationReference: farm.certificationReference,
      certificationUrl: farm.certificationUrl,
      certificationExpiresOn: farm.certificationExpiresOn,
      certificationVerifiedAt: farm.certificationVerifiedAt,
    },
    months: monthTotals,
    produce,
    currentMonth: { season: harvestSeasonYear(), key: harvestMonthKeyFor(new Date()) },
  };
}

type Commitment = {
  crop_id: string | null;
  season: number | null;
  month_key: string | null;
  share_pct: number | null;
  quantity_kg: number | null;
};

async function loadCommitments(farmId: string): Promise<Commitment[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("customer_orders")
    .select("crop_id, season, month_key, share_pct, quantity_kg")
    .eq("farm_id", farmId)
    .neq("status", "cancelled");
  if (error) return [];  // table not there yet — nothing is committed
  return (data ?? []) as Commitment[];
}

/** How much of one crop-month is already spoken for, dated and standing orders alike. */
function committedFor(orders: Commitment[], cropId: string, m: SeasonMonth, expectedKg: number | null): number {
  return orders.reduce((sum, o) => {
    if (o.crop_id !== cropId) return sum;
    const dated = o.season === m.season && o.month_key === m.key;
    const standing = o.season === null && !o.month_key && o.share_pct !== null;
    if (!dated && !standing) return sum;
    return sum + (orderKg(o, expectedKg) ?? 0);
  }, 0);
}

/** Server-side guard: a month can only be ordered if the sheet expects something. */
export function monthIsOffered(produce: ShopProduce[], cropId: string, season: number, key: string): ShopMonth | null {
  const crop = produce.find((p) => p.cropId === cropId);
  if (!crop) return null;
  return crop.months.find((m) => m.season === season && m.key === key) ?? null;
}

export function monthLabel(season: number, key: string): string {
  const m = HARVEST_MONTHS.find((x) => x.key === key);
  if (!m) return "";
  const year = key === "jan" || key === "feb" ? season + 1 : season;
  return `${m.label} ${year}`;
}

/* ── The market: every farm's produce in one place ──────────── */

export type MarketFarm = {
  slug: string;
  name: string;
  location: string | null;
  heroUrl: string | null;
  produce: ShopProduce[];
  totalExpectedKg: number;
  totalAvailableKg: number;
  growingPractice: GrowingPractice;
  practiceNotes: string | null;
  certificationBody: string | null;
  certificationReference: string | null;
  certificationUrl: string | null;
  certificationExpiresOn: string | null;
  certificationVerifiedAt: string | null;
  /** Months this farm has produce in, earliest first. */
  monthLabels: string[];
};

export type MarketData = {
  farms: MarketFarm[];
  totalExpectedKg: number;
  totalAvailableKg: number;
  cropCount: number;
};

/**
 * Every active farm that has produce with an expected harvest. A farm with
 * nothing coming is left out entirely rather than listed as empty.
 */
export async function getMarketData(): Promise<MarketData> {
  const { farms: listed } = await listedFarms();

  const farms: MarketFarm[] = [];
  for (const row of [...listed].sort((a, b) => a.name.localeCompare(b.name))) {
    const shop = await getShopData(row.slug || row.name);
    if (!shop || shop.produce.length === 0) continue;

    const seen: string[] = [];
    for (const p of shop.produce) {
      for (const m of p.months) {
        const label = `${m.label} ${m.calendarYear}`;
        if (!seen.includes(label)) seen.push(label);
      }
    }

    farms.push({
      slug: shop.farm.slug,
      name: shop.farm.name,
      location: shop.farm.location,
      heroUrl: shop.farm.heroUrl,
      growingPractice: shop.farm.growingPractice,
      practiceNotes: shop.farm.practiceNotes,
      certificationBody: shop.farm.certificationBody,
      certificationReference: shop.farm.certificationReference,
      certificationUrl: shop.farm.certificationUrl,
      certificationExpiresOn: shop.farm.certificationExpiresOn,
      certificationVerifiedAt: shop.farm.certificationVerifiedAt,
      produce: shop.produce,
      totalExpectedKg: shop.produce.reduce((sum, p) => sum + p.totalExpectedKg, 0),
      totalAvailableKg: shop.produce.reduce((sum, p) => sum + p.totalAvailableKg, 0),
      monthLabels: seen,
    });
  }

  return {
    farms,
    totalExpectedKg: farms.reduce((sum, f) => sum + f.totalExpectedKg, 0),
    totalAvailableKg: farms.reduce((sum, f) => sum + f.totalAvailableKg, 0),
    cropCount: farms.reduce((sum, f) => sum + f.produce.length, 0),
  };
}
