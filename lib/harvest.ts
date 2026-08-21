/* Pure harvest arithmetic — no database, so server-only code can use it without
   pulling in the browser Supabase client that lib/farm.ts creates at import
   time. lib/farm.ts re-exports all of it, so existing imports keep working. */

type BedLike = { name: string; code: string | null };
type AmountLike = { share_pct: number | null; quantity_kg: number | null };
type OrderLike = AmountLike & { crop_id: string | null; season: number | null; month_key: string | null };

/* ── Harvest ETA season helpers ───────────────────────────────
   The harvest year runs Mar → Feb, so "2025" means Mar 2025 – Feb 2026. */

export const HARVEST_MONTHS = [
  { key: "mar", label: "Mar", month: 3 },
  { key: "apr", label: "Apr", month: 4 },
  { key: "may", label: "May", month: 5 },
  { key: "jun", label: "Jun", month: 6 },
  { key: "jul", label: "Jul", month: 7 },
  { key: "aug", label: "Aug", month: 8 },
  { key: "sep", label: "Sep", month: 9 },
  { key: "oct", label: "Oct", month: 10 },
  { key: "nov", label: "Nov", month: 11 },
  { key: "dec", label: "Dec", month: 12 },
  { key: "jan", label: "Jan", month: 1 },
  { key: "feb", label: "Feb", month: 2 },
] as const;

export type HarvestMonthKey = (typeof HARVEST_MONTHS)[number]["key"];

/** Calendar year of a month within a given harvest season (Jan/Feb roll over). */
export function harvestMonthYear(key: HarvestMonthKey, seasonYear: number): number {
  return key === "jan" || key === "feb" ? seasonYear + 1 : seasonYear;
}

/** The harvest season a calendar date belongs to (Jan/Feb belong to the previous season). */
export function harvestSeasonYear(date: Date | string = new Date()): number {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return new Date().getFullYear();
  return d.getMonth() + 1 >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}

/** One month on the sheet: which season row stores it, and how to label it. */
export type SeasonMonth = {
  key: HarvestMonthKey;
  label: string;
  /** The harvest_eta row's `year` — the Mar–Feb season this month belongs to. */
  season: number;
  /** Calendar year, e.g. Jan of season 2026 is 2027. */
  calendarYear: number;
};

/**
 * A continuous run of months across consecutive seasons, so the sheet can plan
 * further ahead than the twelve months of a single Mar–Feb season.
 */
export function seasonMonths(startSeason: number, seasonCount = 2): SeasonMonth[] {
  const months: SeasonMonth[] = [];
  for (let i = 0; i < seasonCount; i++) {
    const season = startSeason + i;
    for (const m of HARVEST_MONTHS) {
      months.push({
        key: m.key,
        label: m.label,
        season,
        calendarYear: harvestMonthYear(m.key, season),
      });
    }
  }
  return months;
}

/** First day of a season month as an ISO date, for date columns like crops.expected_harvest_start. */
export function harvestMonthStartDate(key: HarvestMonthKey, seasonYear: number): string {
  const month = HARVEST_MONTHS.find((m) => m.key === key);
  if (!month) return "";
  return `${harvestMonthYear(key, seasonYear)}-${String(month.month).padStart(2, "0")}-01`;
}

export function harvestMonthKeyFor(date: Date | string): HarvestMonthKey {
  const d = typeof date === "string" ? new Date(date) : date;
  const month = Number.isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1;
  return (HARVEST_MONTHS.find((m) => m.month === month)?.key ?? "mar") as HarvestMonthKey;
}

/** Bed label used on the harvest ETA sheet — the zone code if it has one. */
export function bedLabel(zone: BedLike | undefined | null): string {
  if (!zone) return "";
  return zone.code?.trim() || zone.name;
}

/* The harvest ETA sheet stores month cells as free text — "20kg", "10-15 kg",
   "1.5t", "500g", "40". Totalling produce means reading a weight out of that
   without silently swallowing anything it cannot understand. */

const WEIGHT_UNITS: { pattern: RegExp; toKg: number }[] = [
  { pattern: /^(t|tonnes?|tons?)$/i, toKg: 1000 },
  { pattern: /^(kgs?|kilos?|kilograms?)$/i, toKg: 1 },
  { pattern: /^(g|grams?)$/i, toKg: 0.001 },
  { pattern: /^(lbs?|pounds?)$/i, toKg: 0.453592 },
];

export type ParsedYield = {
  /** Weight in kilos, or null when no number could be read. */
  kg: number | null;
  /** True when the text gave a range like "10-15kg" and kg is its midpoint. */
  isRange: boolean;
  /** The unit that was read, or null when none was written (kilos assumed). */
  unit: string | null;
};

/* Words that sit next to a number without being a unit. */
const NOT_A_UNIT = /^(to|and|or|approx|approximately|about|circa|ca|est|estimate[ds]?|ish|plus|total|each)$/i;

/** Read a weight in kilos out of a free-text yield cell. */
export function parseYieldKg(text: string | null | undefined): ParsedYield {
  const raw = (text ?? "").trim();
  if (!raw) return { kg: null, isRange: false, unit: null };

  /* Strip thousands separators so "1,200kg" reads as one number. */
  const cleaned = raw.replace(/,(?=\d{3}(?!\d))/g, "");

  /* Every number, with whatever word follows it. */
  const parts: { value: number; unit: string | null }[] = [];
  const re = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(cleaned)) !== null) {
    const word = match[2] ?? null;
    parts.push({ value: parseFloat(match[1]), unit: word && NOT_A_UNIT.test(word) ? null : word });
  }
  if (parts.length === 0) return { kg: null, isRange: false, unit: null };

  /* A recognised weight unit anywhere wins ("10 to 15kg"). A word that is not a
     weight means these are not kilos at all ("20 crates"), so nothing is
     invented — the cell is reported as unconverted instead. */
  const withUnit = parts.find((p) => p.unit);
  const unitText = withUnit?.unit ?? null;
  const unit = unitText ? WEIGHT_UNITS.find((u) => u.pattern.test(unitText)) : undefined;
  if (unitText && !unit) return { kg: null, isRange: false, unit: unitText };

  const isRange = /\d\s*(?:-|–|to)\s*\d/.test(cleaned) && parts.length >= 2;
  const value = isRange ? (parts[0].value + parts[1].value) / 2 : parts[0].value;
  if (!Number.isFinite(value)) return { kg: null, isRange: false, unit: unitText };

  return { kg: value * (unit?.toKg ?? 1), isRange, unit: unitText };
}

/**
 * A standing order: a share of one crop with no month set, so it applies to
 * every month that crop is expected to yield in. Ticking a crop for a customer
 * creates one of these.
 */
export function isStandingOrder(order: OrderLike): boolean {
  return !!order.crop_id && order.season === null && !order.month_key && order.share_pct !== null;
}

/**
 * What an order actually comes to in kilos. A fixed weight stands on its own; a
 * share needs the expected harvest for that crop and month, and comes back null
 * when there is no estimate to take a share of.
 */
export function orderKg(order: AmountLike, expectedKg: number | null): number | null {
  if (order.quantity_kg !== null && order.quantity_kg !== undefined) return order.quantity_kg;
  if (order.share_pct === null || order.share_pct === undefined) return null;
  if (expectedKg === null) return null;
  return (expectedKg * order.share_pct) / 100;
}

