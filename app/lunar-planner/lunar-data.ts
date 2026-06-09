// Static reference content and helpers for the Lunar Farming Planner.
// Moon phases are calculated automatically; guidance, biodynamic icons and
// recommendations are all derived from the calculated (or overridden) phase.

export const MOON_PHASES = [
  "New Moon",
  "Waxing Moon",
  "Full Moon",
  "Waning Moon",
] as const;

export type MoonPhase = (typeof MOON_PHASES)[number];

export const TASK_CATEGORIES = [
  "Planting",
  "Fertilising",
  "Pruning",
  "Harvesting",
  "Weeding",
  "Watering",
  "Soil",
  "Processing",
  "Livestock",
  "Compost",
  "Pest Control",
  "Seed Soaking",
  "Medicinal Herbs",
  "Fruit Trees",
  "Other",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_STATUSES = ["planned", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const REMINDER_STATUSES = ["pending", "done", "skipped"] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

// ---------------------------------------------------------------------------
// Lunar Farming Guide — permanent reference panel
// ---------------------------------------------------------------------------
export const REFERENCE_GUIDE: { phase: MoonPhase; summary: string }[] = [
  {
    phase: "New Moon",
    summary:
      "Planning, soil preparation, composting, seed selection, observation, setting intentions.",
  },
  {
    phase: "Waxing Moon",
    summary:
      "Planting leafy greens and above-ground crops, seed soaking, grafting, propagation, encouraging upward growth.",
  },
  {
    phase: "Full Moon",
    summary:
      "Transplanting, watering, feeding, compost activation, peak growth energy.",
  },
  {
    phase: "Waning Moon",
    summary:
      "Planting root crops and tubers, pruning, weeding, fertilising soil, harvesting for storage, processing wood.",
  },
];

export const REFERENCE_NOTE =
  "Moon phases are automatically estimated for farm planning. Manual override is available if you want to adjust based on local observation or a preferred lunar calendar.";

// ---------------------------------------------------------------------------
// Daily lunar guidance — the traditional wisdom, now surfaced per phase inside
// each calendar day instead of as a separate static tips section.
// Lines beginning with "Avoid" / "Sap flow" / "Moisture" are advisories.
// ---------------------------------------------------------------------------
export const PHASE_GUIDANCE: Record<MoonPhase, string[]> = {
  "New Moon": [
    "Good for planning",
    "Good for observing the land",
    "Good for seed selection",
    "Good for compost planning",
    "Good for light soil preparation",
    "Avoid overloading the day with heavy planting",
  ],
  "Waxing Moon": [
    "Good for seed soaking",
    "Good for leafy greens",
    "Good for above-ground crops",
    "Good for grafting",
    "Good for propagation",
    "Good for medicinal leaves and flowers",
    "Sap flow is traditionally considered stronger",
    "Avoid heavy pruning",
  ],
  "Full Moon": [
    "Good for transplanting",
    "Good for feeding plants",
    "Good for turning compost",
    "Good for lighter watering",
    "Good for harvesting crops for immediate use",
    "Moisture retention may be stronger",
    "Avoid deep soil disturbance",
  ],
  "Waning Moon": [
    "Strong for root planting",
    "Good for ginger, turmeric, onions, garlic and tubers",
    "Good for pruning",
    "Good for weeding",
    "Good for pest control",
    "Good for applying mature compost",
    "Good for harvesting storage crops",
    "Good for cutting and processing wood",
    "Good for medicinal roots and bark",
    "Good for deeper soil work",
    "Good for livestock maintenance such as hoof trimming and deworming",
    "Avoid transplanting delicate seedlings",
  ],
};

// Returns true for advisory / caution lines so the UI can de-emphasise them.
export function isAdvisory(line: string): boolean {
  return /^(avoid|sap flow|moisture)/i.test(line);
}

// Short headline used in compact (month) cards.
export const PHASE_HEADLINE: Record<MoonPhase, string> = {
  "New Moon": "Plan & prepare",
  "Waxing Moon": "Sow & grow upward",
  "Full Moon": "Transplant & feed",
  "Waning Moon": "Roots, pruning & harvest",
};

// ---------------------------------------------------------------------------
// Biodynamic icons (emoji) shown on each day, generated from the phase.
// ---------------------------------------------------------------------------
export const BIODYNAMIC_ICONS = {
  planting: { emoji: "🌱", label: "Planting" },
  pruning: { emoji: "✂️", label: "Pruning" },
  watering: { emoji: "💧", label: "Watering" },
  moon: { emoji: "🌕", label: "Moon phase" },
  compost: { emoji: "♻️", label: "Compost" },
  wood: { emoji: "🪵", label: "Wood processing" },
  livestock: { emoji: "🐓", label: "Livestock" },
  harvesting: { emoji: "🧺", label: "Harvesting" },
  root: { emoji: "🥔", label: "Root crops" },
  medicinal: { emoji: "🌿", label: "Medicinal herbs" },
  pest: { emoji: "🐛", label: "Pest control" },
  fruitTrees: { emoji: "🌳", label: "Fruit trees" },
  soil: { emoji: "🌾", label: "Soil work" },
  seedSoaking: { emoji: "🫘", label: "Seed soaking" },
} as const;

export type BiodynamicIconKey = keyof typeof BIODYNAMIC_ICONS;

// Which biodynamic icons apply to each phase (the first is always the moon).
export const PHASE_ICONS: Record<MoonPhase, BiodynamicIconKey[]> = {
  "New Moon": ["moon", "soil", "compost", "seedSoaking"],
  "Waxing Moon": ["moon", "planting", "seedSoaking", "medicinal", "fruitTrees"],
  "Full Moon": ["moon", "planting", "harvesting", "compost", "watering"],
  "Waning Moon": [
    "moon",
    "root",
    "pruning",
    "harvesting",
    "wood",
    "pest",
    "medicinal",
    "soil",
    "livestock",
  ],
};

// Phase-specific moon glyph for the "moon" biodynamic icon and badges.
export const PHASE_MOON_EMOJI: Record<MoonPhase, string> = {
  "New Moon": "🌑",
  "Waxing Moon": "🌒",
  "Full Moon": "🌕",
  "Waning Moon": "🌘",
};

// Short colour theme per phase, used to tint cards and badges.
export const PHASE_THEME: Record<
  MoonPhase,
  { badge: string; ring: string; chip: string; dot: string; soft: string }
> = {
  "New Moon": {
    badge: "bg-slate-800 text-slate-100",
    ring: "border-slate-200",
    chip: "bg-slate-100 text-slate-700",
    dot: "bg-slate-800",
    soft: "bg-slate-50",
  },
  "Waxing Moon": {
    badge: "bg-emerald-600 text-white",
    ring: "border-emerald-200",
    chip: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    soft: "bg-emerald-50/60",
  },
  "Full Moon": {
    badge: "bg-amber-500 text-white",
    ring: "border-amber-200",
    chip: "bg-amber-50 text-amber-700",
    dot: "bg-amber-400",
    soft: "bg-amber-50/60",
  },
  "Waning Moon": {
    badge: "bg-indigo-600 text-white",
    ring: "border-indigo-200",
    chip: "bg-indigo-50 text-indigo-700",
    dot: "bg-indigo-500",
    soft: "bg-indigo-50/60",
  },
};

// ---------------------------------------------------------------------------
// "Best Next 3 Days" recommendation templates.
// ---------------------------------------------------------------------------
export interface RecommendationTemplate {
  key: "root" | "leafy" | "compost";
  title: string;
  phase: MoonPhase;
  centre: number; // ideal moon-age fraction for this phase
  tasks: string[];
}

export const RECOMMENDATION_TEMPLATES: RecommendationTemplate[] = [
  {
    key: "root",
    title: "Best for Root Crops",
    phase: "Waning Moon",
    centre: 0.75,
    tasks: ["Plant ginger", "Plant turmeric", "Apply compost", "Weed beds"],
  },
  {
    key: "leafy",
    title: "Best for Leafy Growth",
    phase: "Waxing Moon",
    centre: 0.25,
    tasks: ["Plant spinach", "Plant herbs", "Soak seeds", "Propagate cuttings"],
  },
  {
    key: "compost",
    title: "Best for Compost & Feeding",
    phase: "Full Moon",
    centre: 0.5,
    tasks: ["Turn compost", "Feed plants", "Light watering", "Harvest fresh produce"],
  },
];

// ---------------------------------------------------------------------------
// Date helpers (all local-date based, no timezone surprises)
// ---------------------------------------------------------------------------

// Returns YYYY-MM-DD for a Date using its LOCAL calendar day.
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse a YYYY-MM-DD string into a local Date at midnight.
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function addMonths(d: Date, n: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + n);
  return next;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Pretty short label, e.g. "9 June" or "9 Jun".
export function formatDayLabel(
  d: Date,
  opts: { weekday?: boolean; year?: boolean; short?: boolean } = {}
): string {
  return d.toLocaleDateString("en-GB", {
    weekday: opts.weekday ? "short" : undefined,
    day: "numeric",
    month: opts.short ? "short" : "long",
    year: opts.year ? "numeric" : undefined,
  });
}

// ---------------------------------------------------------------------------
// Automatic moon-phase calculation.
//   Synodic month length: 29.53058867 days
//   Known reference new moon: 2000-01-06 18:14 UTC
//   Current date difference modulo lunar cycle
// ---------------------------------------------------------------------------
export const SYNODIC_MONTH = 29.53058867;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

// Fractional age of the moon (0 = new, 0.5 = full) for a given local date.
export function moonAgeFraction(d: Date): number {
  const noonUTC = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const days = (noonUTC - KNOWN_NEW_MOON) / 86400000;
  let frac = (days % SYNODIC_MONTH) / SYNODIC_MONTH;
  if (frac < 0) frac += 1;
  return frac;
}

// Map the continuous cycle onto the four named phases, with each cardinal
// phase occupying a quarter-cycle window centred on its exact moment.
export function calcMoonPhase(d: Date): MoonPhase {
  const f = moonAgeFraction(d);
  if (f < 0.125 || f >= 0.875) return "New Moon";
  if (f < 0.375) return "Waxing Moon";
  if (f < 0.625) return "Full Moon";
  return "Waning Moon";
}

// Circular distance between two moon-age fractions (0..0.5).
export function fractionDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 1;
  return Math.min(diff, 1 - diff);
}
