/* The descriptive fields a crop can carry — the sort of thing a customer wants
   to read on the shop, kept in one list so the forms, the crops page and the
   shopfront never drift apart. Every one is optional; the shop shows only the
   ones that have been filled in. */

export type CropDetailField = {
  key: "flavour" | "appearance" | "size" | "best_eaten" | "nutritional_qualities" | "why_special";
  label: string;
  placeholder: string;
  /** Long fields get a textarea, short ones a single line. */
  long: boolean;
};

export const CROP_DETAIL_FIELDS: CropDetailField[] = [
  { key: "flavour", label: "Flavour", placeholder: "Sweet and smoky, with a peppery finish…", long: false },
  { key: "appearance", label: "Appearance", placeholder: "Deep purple, glossy, teardrop shaped…", long: false },
  { key: "size", label: "Size", placeholder: "300–400g each, about the size of a fist…", long: false },
  { key: "best_eaten", label: "Best eaten", placeholder: "Grilled whole, or sliced into a curry…", long: false },
  { key: "nutritional_qualities", label: "Nutritional qualities", placeholder: "High in vitamin C, iron and fibre…", long: true },
  { key: "why_special", label: "Why it's special", placeholder: "Grown from seed we save ourselves, rare in the market here…", long: true },
];

/** Blank strings for every detail field, for seeding a form. */
export function blankCropDetails(): Record<CropDetailField["key"], string> {
  return {
    flavour: "", appearance: "", size: "", best_eaten: "", nutritional_qualities: "", why_special: "",
  };
}

/** Read the details off a crop row into form strings. */
export function cropDetailsToForm(crop: Record<string, unknown> | null | undefined) {
  const form = blankCropDetails();
  if (!crop) return form;
  for (const field of CROP_DETAIL_FIELDS) {
    form[field.key] = ((crop[field.key] as string | null) ?? "") || "";
  }
  return form;
}

/** Trim form strings into a payload, empty ones going in as null. */
export function cropDetailsPayload(form: Record<string, string>): Record<string, string | null> {
  const payload: Record<string, string | null> = {};
  for (const field of CROP_DETAIL_FIELDS) {
    payload[field.key] = (form[field.key] ?? "").trim() || null;
  }
  return payload;
}

/** The filled-in details, in display order — what the shop shows. */
export function filledCropDetails(crop: Record<string, unknown> | null | undefined) {
  if (!crop) return [];
  return CROP_DETAIL_FIELDS.map((field) => ({
    label: field.label,
    value: ((crop[field.key] as string | null) ?? "").trim(),
  })).filter((d) => d.value !== "");
}
