// Static reference content and helpers for the Lunar Farming Planner.
// Kept separate from the page component so the guidance copy is easy to edit.

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

// ---------------------------------------------------------------------------
// 1. Lunar Farming Guide — permanent reference panel
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

// ---------------------------------------------------------------------------
// 2. Traditional Lunar Farming Wisdom — 10 permanent advice points
// ---------------------------------------------------------------------------
export const TRADITIONAL_WISDOM: { title: string; lines: string[] }[] = [
  {
    title: "Seed Soaking Timing",
    lines: [
      "Traditionally, seeds were soaked during waxing phases to encourage vigorous upward growth.",
      "Use waxing moon for leafy greens and above-ground crops.",
      "Use waning moon for root crop seeds.",
    ],
  },
  {
    title: "Sap Flow Awareness",
    lines: [
      "Traditional farmers believed sap rises during waxing moons and lowers during waning moons.",
      "Use waxing moon for grafting and propagation.",
      "Use waning moon for pruning and cutting wood.",
    ],
  },
  {
    title: "Harvest Storage Timing",
    lines: [
      "Crops intended for long storage were traditionally harvested during waning moons.",
      "Use waning moon for onions, garlic, ginger, turmeric and drying crops.",
      "Use full moon harvests more for immediate eating.",
    ],
  },
  {
    title: "Medicinal Herb Timing",
    lines: [
      "Traditional herbalists harvested plant parts according to moon phase.",
      "Use waxing moon for leaves and flowers.",
      "Use waning moon for roots, bark and medicinal tubers.",
    ],
  },
  {
    title: "Compost Activation",
    lines: [
      "Biodynamic and traditional farming calendars often favour full moon periods for compost activity.",
      "Use full moon for turning compost.",
      "Use waning moon for applying mature compost to soil.",
    ],
  },
  {
    title: "Watering Rhythm",
    lines: [
      "Traditional systems suggest soil may hold more moisture around the full moon.",
      "Use full moon for lighter watering.",
      "Use waning moon for deeper watering where needed.",
    ],
  },
  {
    title: "Pest and Weed Control",
    lines: [
      "Waning moon periods were traditionally used for suppression and clearing tasks.",
      "Use waning moon for weeding, pest control, clearing invasive plants and reducing unwanted growth.",
    ],
  },
  {
    title: "Fruit Tree Care",
    lines: [
      "Old orchard systems often timed pruning and grafting with lunar rhythm.",
      "Use waxing moon for grafting.",
      "Use waning moon for heavy pruning.",
      "Avoid heavy pruning during strong sap-rise periods.",
    ],
  },
  {
    title: "Animal Husbandry",
    lines: [
      "Traditional farms sometimes aligned livestock care with lunar cycles.",
      "Use waxing moon for breeding-related planning.",
      "Use waning moon for hoof trimming, deworming and general livestock maintenance.",
    ],
  },
  {
    title: "Soil Disturbance",
    lines: [
      "Traditional lunar systems often recommend different levels of soil disturbance by phase.",
      "Use new moon for observation and planning.",
      "Use full moon for lighter soil work.",
      "Use waning moon for deeper cultivation, bed restructuring and clearing.",
    ],
  },
];

// ---------------------------------------------------------------------------
// 7. Daily lunar guidance — derived automatically from the selected phase
// ---------------------------------------------------------------------------
export const PHASE_GUIDANCE: Record<MoonPhase, string[]> = {
  "New Moon": [
    "Good for planning",
    "Good for soil preparation",
    "Good for seed selection",
    "Good for compost planning",
    "Avoid overloading the day with heavy planting",
  ],
  "Waxing Moon": [
    "Good for leafy greens",
    "Good for above-ground crops",
    "Good for seed soaking",
    "Good for propagation and grafting",
    "Good for encouraging growth",
  ],
  "Full Moon": [
    "Good for transplanting",
    "Good for feeding plants",
    "Good for compost turning",
    "Good for light watering",
    "Good for harvesting crops for immediate use",
  ],
  "Waning Moon": [
    "Good for root crops and tubers",
    "Good for pruning",
    "Good for weeding and pest control",
    "Good for applying mature compost",
    "Good for harvesting storage crops",
    "Good for cutting and processing wood",
    "Good for deeper soil work",
    "Good for livestock maintenance",
  ],
};

// Short colour theme per phase, used to tint cards and badges.
export const PHASE_THEME: Record<
  MoonPhase,
  { badge: string; ring: string; chip: string; dot: string }
> = {
  "New Moon": {
    badge: "bg-slate-800 text-slate-100",
    ring: "border-slate-200",
    chip: "bg-slate-100 text-slate-700",
    dot: "bg-slate-800",
  },
  "Waxing Moon": {
    badge: "bg-emerald-600 text-white",
    ring: "border-emerald-200",
    chip: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  "Full Moon": {
    badge: "bg-amber-500 text-white",
    ring: "border-amber-200",
    chip: "bg-amber-50 text-amber-700",
    dot: "bg-amber-400",
  },
  "Waning Moon": {
    badge: "bg-indigo-600 text-white",
    ring: "border-indigo-200",
    chip: "bg-indigo-50 text-indigo-700",
    dot: "bg-indigo-500",
  },
};

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
// Approximate moon-phase calculation. Phases are manually editable in the UI;
// this only supplies a sensible default label when a day has no saved phase.
// Based on the mean synodic month measured from a known new moon.
// ---------------------------------------------------------------------------
const SYNODIC_MONTH = 29.53058867;
// Reference new moon: 2000-01-06 18:14 UTC.
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
export function approxMoonPhase(d: Date): MoonPhase {
  const f = moonAgeFraction(d);
  if (f < 0.125 || f >= 0.875) return "New Moon";
  if (f < 0.375) return "Waxing Moon";
  if (f < 0.625) return "Full Moon";
  return "Waning Moon";
}
