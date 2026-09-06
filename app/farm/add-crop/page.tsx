"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { getFarms, getZones, harvestMonthKeyFor, harvestSeasonYear } from "@/lib/farm";
import type { Farm, Zone } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useLanguage, useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { CROP_DETAIL_FIELDS, blankCropDetails, cropDetailsPayload } from "@/lib/cropDetails";
import { supabase } from "@/lib/supabase";

/* Adding a crop from the shop. One short box gets the crop live; two optional
   pages collect the rest (growing details, then what the shop shows). Every
   page ends with a way straight back to the shop. */

type Step = "quick" | "growing" | "shop";

const inputClass = "mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const primaryButton = "inline-flex items-center justify-center gap-1 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-1 rounded-full border border-emerald-700 px-5 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50";

const blankQuick = { name: "", variety: "", harvestDate: "", expectedKg: "", pricePerKg: "" };
const blankGrowing = { status: "planned", plantedOn: "", zoneIds: [] as string[], notes: "" };

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) return String((err as { message: unknown }).message);
  return fallback;
}

function AddCropInner() {
  const t = useT();
  const [lang, setLang] = useLanguage();
  const params = useSearchParams();
  const back = params.get("back") ?? "";

  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>("quick");

  const [quick, setQuick] = useState(blankQuick);
  const [cropId, setCropId] = useState<string | null>(null);
  const [cropLabel, setCropLabel] = useState("");
  const [growing, setGrowing] = useState(blankGrowing);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [details, setDetails] = useState({ ...blankCropDetails(), medicinal_properties: "" });
  const fileInput = useRef<HTMLInputElement>(null);

  useFarmSelection({ farms, activeFarmId, setActiveFarmId });

  useEffect(() => {
    getFarms().then(setFarms).catch((err) => setError(errMsg(err, t("Could not load farms"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    getZones(activeFarmId).then(setZones).catch(() => setZones([]));
  }, [activeFarmId]);

  const farm = farms.find((item) => item.id === activeFarmId) ?? null;
  const shopHref = useMemo(() => (back.startsWith("/") ? back : farm?.slug ? `/${farm.slug}` : "/farm"), [back, farm]);

  const quickReady = !!quick.name.trim() && !!quick.harvestDate && Number(quick.expectedKg) > 0;

  async function saveQuick(event: React.FormEvent) {
    event.preventDefault();
    if (!farm || !quickReady) return;
    const name = quick.name.trim();
    const variety = quick.variety.trim();
    const kg = Number(quick.expectedKg);
    setBusy(true);
    setError("");
    try {
      const { data: inserted, error: insertError } = await supabase.from("crops").insert({
        farm_id: farm.id,
        crop_name: name,
        variety: variety || null,
        status: "planned",
        expected_harvest_start: quick.harvestDate,
        estimated_yield_kg: kg,
        expected_sale_price_per_kg: quick.pricePerKg ? Number(quick.pricePerKg) : null,
        is_active: true,
      }).select("id").single();
      if (insertError) throw insertError;

      const { error: harvestError } = await supabase.from("harvest_eta").insert({
        farm_id: farm.id,
        year: harvestSeasonYear(quick.harvestDate),
        bed_name: variety ? `${name} · ${variety}` : name,
        crop_id: inserted.id,
        main_crop: name,
        expected_harvest_date: quick.harvestDate,
        [`${harvestMonthKeyFor(quick.harvestDate)}_expected`]: String(kg),
      });
      if (harvestError) throw harvestError;

      await supabase.from("activities").insert({ farm_id: farm.id, type: "crop_created", title: `${name} added`, meta: "Crop added from the shop" });

      setCropId(inserted.id);
      setCropLabel(variety ? `${name} · ${variety}` : name);
      setStep("growing");
    } catch (err) {
      setError(errMsg(err, t("Failed to add crop")));
    } finally {
      setBusy(false);
    }
  }

  function choosePhoto(file: File | null) {
    setPhoto(file);
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : "");
  }

  async function saveGrowing(event: React.FormEvent) {
    event.preventDefault();
    if (!farm || !cropId) return;
    setBusy(true);
    setError("");
    try {
      let produceUrl: string | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop() ?? "jpg";
        const path = `${farm.id}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("plant-images").upload(path, photo);
        if (uploadError) throw uploadError;
        produceUrl = supabase.storage.from("plant-images").getPublicUrl(path).data.publicUrl;
      }
      const zoneIds = growing.zoneIds.filter(Boolean);
      const { error: updateError } = await supabase.from("crops").update({
        status: growing.status,
        planted_on: growing.plantedOn || null,
        zone_id: zoneIds[0] ?? null,
        extra_zone_ids: zoneIds.length > 1 ? JSON.stringify(zoneIds.slice(1)) : null,
        notes: growing.notes.trim() || null,
        ...(produceUrl ? { produce_image_url: produceUrl } : {}),
      }).eq("id", cropId);
      if (updateError) throw updateError;
      setStep("shop");
    } catch (err) {
      setError(errMsg(err, t("Failed to save crop details")));
    } finally {
      setBusy(false);
    }
  }

  async function saveShopDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!cropId) return;
    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await supabase.from("crops").update({
        ...cropDetailsPayload(details),
        medicinal_properties: details.medicinal_properties.trim() || null,
      }).eq("id", cropId);
      if (updateError) throw updateError;
      window.location.href = shopHref;
    } catch (err) {
      setError(errMsg(err, t("Failed to save crop details")));
      setBusy(false);
    }
  }

  function toggleZone(id: string) {
    setGrowing((current) => ({
      ...current,
      zoneIds: current.zoneIds.includes(id) ? current.zoneIds.filter((z) => z !== id) : [...current.zoneIds, id],
    }));
  }

  const pageTitle = t("Add crop");
  const pageNumber = step === "growing" ? 1 : step === "shop" ? 2 : 0;
  const sectionTitle = step === "growing" ? t("Growing details") : step === "shop" ? t("For the shop") : "";

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href={shopHref} className="text-sm font-medium text-zinc-600 hover:text-zinc-950">← {t("Back to shop")}</Link>
          <LanguageToggle lang={lang} onChange={setLang} />
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
            {pageNumber > 0 && <span className="text-xs font-medium text-zinc-500">{t("More details {n} of 2", { n: pageNumber })}</span>}
          </div>

          {!farm ? (
            <p className="mt-4 text-sm text-zinc-500">{t("Loading…")}</p>
          ) : step === "quick" ? (
            <form onSubmit={saveQuick} className="mt-4 grid gap-4">
              <label className="text-sm font-medium text-zinc-700">{t("Crop name")}<input required autoFocus value={quick.name} onChange={(e) => setQuick((q) => ({ ...q, name: e.target.value }))} placeholder={t("e.g. Tomatoes")} className={inputClass} /></label>
              <label className="text-sm font-medium text-zinc-700">{t("Variety")} <span className="font-normal text-zinc-400">({t("optional")})</span><input value={quick.variety} onChange={(e) => setQuick((q) => ({ ...q, variety: e.target.value }))} placeholder={t("e.g. Roma")} className={inputClass} /></label>
              <label className="text-sm font-medium text-zinc-700">{t("Expected harvest date")}<input required type="date" value={quick.harvestDate} onChange={(e) => setQuick((q) => ({ ...q, harvestDate: e.target.value }))} className={inputClass} /></label>
              <label className="text-sm font-medium text-zinc-700">{t("Expected kilograms")}<input required type="number" min="0.1" step="0.1" inputMode="decimal" value={quick.expectedKg} onChange={(e) => setQuick((q) => ({ ...q, expectedKg: e.target.value }))} className={inputClass} /></label>
              <label className="text-sm font-medium text-zinc-700">{t("Expected price per kg")} <span className="font-normal text-zinc-400">({t("optional")})</span><input type="number" min="0" step="0.01" inputMode="decimal" value={quick.pricePerKg} onChange={(e) => setQuick((q) => ({ ...q, pricePerKg: e.target.value }))} className={inputClass} /></label>
              <button type="submit" disabled={busy || !quickReady} className={"w-full " + primaryButton}>{busy ? t("Saving…") : t("Add crop")}<ChevronRight className="h-4 w-4" /></button>
              {!quickReady && <p className="text-xs text-zinc-500">{t("Crop name, expected harvest date and expected kilograms are needed.")}</p>}
            </form>
          ) : (
            <div className="mt-4">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"><Check className="h-5 w-5" />{t("{crop} is now in your shop.", { crop: cropLabel })}</div>
              <a href={shopHref} className={"mt-4 w-full " + primaryButton}>{t("Continue to my shop")}<ChevronRight className="h-4 w-4" /></a>

              <div className="mt-6 border-t border-zinc-200 pt-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold">{sectionTitle}</h2>
                  <span className="text-xs font-medium text-zinc-500">{t("More details {n} of 2", { n: pageNumber })}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{t("Optional. Fill in what you can; you can come back later.")}</p>

                {step === "growing" ? (
                  <form onSubmit={saveGrowing} className="mt-4 grid gap-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-700">{t("Produce photo")}</p>
                      <div className="mt-1.5 flex items-center gap-3">
                        {photoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photoPreview} alt="" className="h-16 w-16 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-zinc-300 text-[10px] text-zinc-400">{t("No photo")}</div>
                        )}
                        <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { choosePhoto(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                        <button type="button" onClick={() => fileInput.current?.click()} className={secondaryButton}>{photo ? t("Swap photo") : t("Add photo")}</button>
                      </div>
                    </div>
                    <label className="text-sm font-medium text-zinc-700">{t("Status")}
                      <select value={growing.status} onChange={(e) => setGrowing((g) => ({ ...g, status: e.target.value }))} className={inputClass}>
                        {["planned", "planted", "germinating", "growing", "harvest_ready"].map((value) => <option key={value} value={value}>{t(value)}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-zinc-700">{t("Planted on")}<input type="date" value={growing.plantedOn} onChange={(e) => setGrowing((g) => ({ ...g, plantedOn: e.target.value }))} className={inputClass} /></label>
                    {zones.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-zinc-700">{t("Beds")}</p>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {zones.map((zone) => (
                            <button key={zone.id} type="button" onClick={() => toggleZone(zone.id)} className={"rounded-full border px-3 py-1.5 text-sm " + (growing.zoneIds.includes(zone.id) ? "border-emerald-700 bg-emerald-700 text-white" : "border-zinc-300 bg-white text-zinc-700")}>{zone.name}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="text-sm font-medium text-zinc-700">{t("Notes")}<textarea rows={3} value={growing.notes} onChange={(e) => setGrowing((g) => ({ ...g, notes: e.target.value }))} placeholder={t("Growing conditions, observations…")} className={inputClass} /></label>
                    <button type="submit" disabled={busy} className={"w-full " + primaryButton}>{busy ? t("Saving…") : t("Save and continue")}<ChevronRight className="h-4 w-4" /></button>
                  </form>
                ) : (
                  <form onSubmit={saveShopDetails} className="mt-4 grid gap-4">
                    <p className="text-sm text-zinc-600">{t("Whatever you fill in here is shown to customers on the shopfront. Anything left blank simply is not shown.")}</p>
                    {CROP_DETAIL_FIELDS.map((field) => (
                      <label key={field.key} className="text-sm font-medium text-zinc-700">{t(field.label)}
                        {field.long
                          ? <textarea rows={2} value={details[field.key]} onChange={(e) => setDetails((d) => ({ ...d, [field.key]: e.target.value }))} placeholder={t(field.placeholder)} className={inputClass} />
                          : <input value={details[field.key]} onChange={(e) => setDetails((d) => ({ ...d, [field.key]: e.target.value }))} placeholder={t(field.placeholder)} className={inputClass} />}
                      </label>
                    ))}
                    <label className="text-sm font-medium text-zinc-700">{t("Medicinal properties")}<textarea rows={2} value={details.medicinal_properties} onChange={(e) => setDetails((d) => ({ ...d, medicinal_properties: e.target.value }))} placeholder={t("Known medicinal uses, healing properties…")} className={inputClass} /></label>
                    <button type="submit" disabled={busy} className={"w-full " + primaryButton}>{busy ? t("Saving…") : t("Save and go to my shop")}<ChevronRight className="h-4 w-4" /></button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function AddCropPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-stone-50 text-sm text-zinc-500">…</main>}>
      <AddCropInner />
    </Suspense>
  );
}
