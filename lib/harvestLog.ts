/* Logging and correcting harvests. Shared by the farm dashboard's Log harvest
   form and the Harvest Logs page, so both keep crop yields, the activity feed
   and the EH / ORG split in step the same way. */

import { supabase } from "@/lib/supabase";
import { saveHarvestSplits } from "@/lib/farm";
import type { Crop, HarvestLog } from "@/lib/farm";
import { estimatedKg, splitsFromFields } from "@/lib/harvest";
import type { HarvestSplit } from "@/lib/harvest";
import type { Translate } from "@/lib/i18n";
import type { HarvestFormData } from "@/app/farm/components/HarvestForm";

const round3 = (n: number) => Math.round(n * 1000) / 1000;

function checkSplit(t: Translate, harvestKg: number | null, splits: HarvestSplit[]) {
  const assignedKg = splits.reduce((sum, s) => sum + s.quantity_kg, 0);
  if (harvestKg !== null && assignedKg > harvestKg + 0.0005) {
    throw new Error(t("EH and ORG add up to more than the harvest."));
  }
}

/**
 * Save a new harvest, add it to the crop's running yield and the activity
 * feed, and record where it went. Throws with a translated message when the
 * input is invalid or the harvest could not be saved. When only the split
 * fails the harvest stays saved and `splitError` says so: the farmer must not
 * be sent back to submit again, which would log the harvest twice.
 */
export async function logHarvest(
  farmId: string,
  data: HarvestFormData,
  crops: Crop[],
  t: Translate
): Promise<{ splitError: string }> {
  if (!data.crop_id) throw new Error(t("Choose a crop before logging harvest."));
  if (!data.harvest_date) throw new Error(t("Harvest date is required."));
  const counting = data.unit_mode === "units";
  const harvestUnits = counting ? Math.floor(Number(data.quantity_units)) : null;
  const weighedKg = data.quantity_kg.trim() ? Number(data.quantity_kg) : null;
  if (counting) {
    if (!harvestUnits || harvestUnits < 1) throw new Error(t("Enter how many were picked."));
  } else if (weighedKg === null) {
    throw new Error(t("Harvest quantity is required."));
  }
  if (weighedKg !== null && (!Number.isFinite(weighedKg) || weighedKg < 0)) {
    throw new Error(t("Harvest quantity is required."));
  }
  const perPiece = counting && data.kg_per_unit.trim() ? Number(data.kg_per_unit) : null;
  if (perPiece !== null && (!Number.isFinite(perPiece) || perPiece <= 0)) {
    throw new Error(t("The weight of one piece must be more than 0."));
  }

  const selectedCrop = crops.find((crop) => crop.id === data.crop_id) ?? null;

  /* No scale: estimate the weight from the count and the average piece. */
  const estimatedHarvestKg = counting && weighedKg === null ? estimatedKg(data.quantity_units, data.kg_per_unit) : null;
  const harvestQty = weighedKg ?? estimatedHarvestKg;

  /* Where it went (EH / ORG). Shares only make sense against a weight. */
  const splits = harvestQty !== null && data.split ? splitsFromFields(data.split) : [];
  checkSplit(t, harvestQty, splits);

  const { data: harvestRow, error: harvestError } = await supabase
    .from("harvests")
    .insert({
      farm_id: farmId,
      crop_id: data.crop_id,
      zone_id: data.zone_id || null,
      harvest_date: data.harvest_date,
      quantity_kg: harvestQty,
      quantity_units: harvestUnits,
      weight_estimated: estimatedHarvestKg !== null,
      quality: data.quality,
      notes: data.notes.trim() || null,
    })
    .select("id")
    .single();
  if (harvestError) throw harvestError;

  let splitError = "";
  if (splits.length > 0 && harvestRow?.id) {
    try {
      await saveHarvestSplits(farmId, harvestRow.id, splits);
    } catch {
      splitError = t("Harvest logged, but where it went was not saved. Set EH / ORG on the Harvest Logs page.");
    }
  }

  const cropUpdates: Record<string, unknown> = {};
  if (harvestQty !== null) {
    cropUpdates.actual_yield_kg = Number(selectedCrop?.actual_yield_kg ?? 0) + harvestQty;
  }
  if (harvestUnits !== null) {
    cropUpdates.actual_yield_units = Number(selectedCrop?.actual_yield_units ?? 0) + harvestUnits;
  }

  /* Remember the piece weight the farmer typed; if they weighed a count and
     none is set yet, learn it from this harvest. */
  const currentPerPiece = selectedCrop?.kg_per_unit ? Number(selectedCrop.kg_per_unit) : null;
  if (perPiece !== null && perPiece !== currentPerPiece) {
    cropUpdates.kg_per_unit = perPiece;
  } else if (perPiece === null && currentPerPiece === null && harvestUnits && weighedKg) {
    cropUpdates.kg_per_unit = round3(weighedKg / harvestUnits);
  }

  if (selectedCrop?.status !== "harvested") {
    cropUpdates.status = "harvested";
    cropUpdates.actual_harvest_date = data.harvest_date;
  }

  if (Object.keys(cropUpdates).length > 0) {
    const { error: cropUpdateError } = await supabase.from("crops").update(cropUpdates).eq("id", data.crop_id);
    if (cropUpdateError) throw cropUpdateError;
  }

  const amount = [
    harvestUnits !== null ? `${harvestUnits} pcs` : null,
    harvestQty !== null ? `${estimatedHarvestKg !== null ? "≈" : ""}${harvestQty} kg` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  await supabase.from("activities").insert({
    farm_id: farmId,
    type: "harvest_logged",
    title: `${selectedCrop?.crop_name ?? "Harvest"} logged`,
    meta: `${amount} · ${data.quality}`,
  });

  return { splitError };
}

export type HarvestCorrection = {
  crop_id: string;
  zone_id: string | null;
  harvest_date: string;
  quantity_kg: number | null;
  quantity_units: number | null;
  /** True when the kilos were estimated from the count rather than weighed. */
  weight_estimated: boolean;
  quality: string;
  notes: string | null;
  splits: HarvestSplit[];
};

/* Add (or with a negative sign, take away) a harvest's amount from a crop's
   running yield, reading the crop fresh so a stale page can't overwrite it. */
async function adjustCropYield(cropId: string, kg: number, units: number) {
  if (!cropId || (kg === 0 && units === 0)) return;
  const { data: crop, error } = await supabase
    .from("crops")
    .select("actual_yield_kg, actual_yield_units")
    .eq("id", cropId)
    .maybeSingle();
  if (error) throw error;
  if (!crop) return;
  const patch: Record<string, number> = {};
  if (kg !== 0) patch.actual_yield_kg = Math.max(0, round3(Number(crop.actual_yield_kg ?? 0) + kg));
  if (units !== 0) patch.actual_yield_units = Math.max(0, Number(crop.actual_yield_units ?? 0) + units);
  const { error: updateError } = await supabase.from("crops").update(patch).eq("id", cropId);
  if (updateError) throw updateError;
}

/**
 * Correct a logged harvest: its date, crop, bed, amount, quality, notes and
 * where it went. Crop yields move by the difference, so fixing a 140 kg typo
 * to 0.14 kg also takes 139.86 kg back off the crop.
 */
export async function updateHarvest(
  farmId: string,
  original: HarvestLog,
  next: HarvestCorrection,
  t: Translate
): Promise<void> {
  if (!next.crop_id) throw new Error(t("Choose a crop before logging harvest."));
  if (!next.harvest_date) throw new Error(t("Harvest date is required."));
  if (next.quantity_kg === null && next.quantity_units === null) throw new Error(t("Harvest quantity is required."));
  if (next.quantity_kg !== null && (!Number.isFinite(next.quantity_kg) || next.quantity_kg < 0)) {
    throw new Error(t("Harvest quantity is required."));
  }
  if (next.quantity_units !== null && (!Number.isInteger(next.quantity_units) || next.quantity_units < 0)) {
    throw new Error(t("Enter how many were picked."));
  }
  checkSplit(t, next.quantity_kg, next.splits);

  const { error } = await supabase
    .from("harvests")
    .update({
      crop_id: next.crop_id,
      zone_id: next.zone_id,
      harvest_date: next.harvest_date,
      quantity_kg: next.quantity_kg,
      quantity_units: next.quantity_units,
      weight_estimated: next.weight_estimated,
      quality: next.quality,
      notes: next.notes,
    })
    .eq("id", original.id)
    .eq("farm_id", farmId);
  if (error) throw error;

  const oldKg = Number(original.quantity_kg ?? 0);
  const oldUnits = Number(original.quantity_units ?? 0);
  const newKg = Number(next.quantity_kg ?? 0);
  const newUnits = Number(next.quantity_units ?? 0);
  if (original.crop_id === next.crop_id) {
    await adjustCropYield(next.crop_id, round3(newKg - oldKg), newUnits - oldUnits);
  } else {
    await adjustCropYield(original.crop_id, -oldKg, -oldUnits);
    await adjustCropYield(next.crop_id, newKg, newUnits);
  }

  await saveHarvestSplits(farmId, original.id, next.quantity_kg ? next.splits : []);
}
