"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, ExternalLink, Leaf } from "lucide-react";
import { getCrops, getFarms, saveActiveFarmId } from "@/lib/farm";
import type { Crop, Farm } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useLanguage, useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { supabase } from "@/lib/supabase";

/* The second wizard. The first one (/farm/onboarding) gets a farm and its
   crops into a live shop as fast as possible; this one fills in what buyers
   want to know next: how the food is grown, how to get it, what it looks
   like, and where the farm is. "Manage farm" on the public shop lands here. */

type Practice = {
  growingPractice: string;
  practiceNotes: string;
  certificationBody: string;
  certificationReference: string;
  certificationUrl: string;
  certificationExpiresOn: string;
};
type Fulfilment = { contactPhone: string; fulfilmentMethod: string; collectionInstructions: string; deliveryArea: string };
type Coordinates = { latitude: number | null; longitude: number | null };

const inputClass = "mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const primaryButton = "rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "rounded-full border border-emerald-700 px-5 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) return String((err as { message: unknown }).message);
  return fallback;
}

export default function PrepareFarmPage() {
  const t = useT();
  const [lang, setLang] = useLanguage();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const [listed, setListed] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [practice, setPractice] = useState<Practice>({ growingPractice: "unspecified", practiceNotes: "", certificationBody: "", certificationReference: "", certificationUrl: "", certificationExpiresOn: "" });
  const [fulfilment, setFulfilment] = useState<Fulfilment>({ contactPhone: "", fulfilmentMethod: "collection", collectionInstructions: "", deliveryArea: "" });
  const [coordinates, setCoordinates] = useState<Coordinates>({ latitude: null, longitude: null });
  const [sizeAcres, setSizeAcres] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const heroInput = useRef<HTMLInputElement>(null);

  useFarmSelection({ farms, activeFarmId, setActiveFarmId });

  useEffect(() => {
    getFarms().then(setFarms).catch((err) => setError(errMsg(err, t("Could not load farms")))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    let cancelled = false;
    setLoading(true);
    setActiveStep(null);
    Promise.all([
      getCrops(activeFarmId),
      fetch(`/api/farm/market-listing?farm_id=${encodeURIComponent(activeFarmId)}`).then((res) => res.json()),
    ]).then(([cropRows, shop]) => {
      if (cancelled) return;
      setCrops(cropRows);
      setPrices(Object.fromEntries(cropRows.map((crop) => [crop.id, crop.expected_sale_price_per_kg?.toString() ?? ""])));
      setListed(!!shop.listed);
      setSlug(shop.slug ?? null);
      setHeroUrl(shop.heroUrl ?? null);
      setPractice({
        growingPractice: shop.growingPractice ?? "unspecified",
        practiceNotes: shop.practiceNotes ?? "",
        certificationBody: shop.certificationBody ?? "",
        certificationReference: shop.certificationReference ?? "",
        certificationUrl: shop.certificationUrl ?? "",
        certificationExpiresOn: shop.certificationExpiresOn ?? "",
      });
      setFulfilment({
        contactPhone: shop.contactPhone ?? "",
        fulfilmentMethod: shop.fulfilmentMethod ?? "collection",
        collectionInstructions: shop.collectionInstructions ?? "",
        deliveryArea: shop.deliveryArea ?? "",
      });
      setCoordinates({ latitude: shop.latitude ?? null, longitude: shop.longitude ?? null });
      void saveActiveFarmId(activeFarmId);
    }).catch((err) => {
      if (!cancelled) setError(errMsg(err, t("Could not load the farm")));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFarmId]);

  const farm = farms.find((item) => item.id === activeFarmId) ?? null;

  useEffect(() => {
    if (farm) setSizeAcres(farm.size_acres?.toString() ?? "");
  }, [farm]);

  useEffect(() => {
    if (activeStep === null) return;
    document.getElementById(`step-${activeStep}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeStep]);

  async function postListing(payload: Record<string, unknown>, fallback: string) {
    const res = await fetch("/api/farm/market-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ farmId: activeFarmId, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || fallback);
    return data;
  }

  async function savePractice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (practice.growingPractice === "unspecified") return;
    setSaving("practice");
    setError("");
    try {
      await postListing(practice, t("Could not save growing practices"));
      setActiveStep(1);
    } catch (err) {
      setError(errMsg(err, t("Could not save growing practices")));
    } finally {
      setSaving(null);
    }
  }

  async function saveFulfilment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fulfilment.contactPhone.trim()) return;
    setSaving("fulfilment");
    setError("");
    try {
      await postListing(fulfilment, t("Could not save collection and delivery details"));
      setActiveStep(2);
    } catch (err) {
      setError(errMsg(err, t("Could not save collection and delivery details")));
    } finally {
      setSaving(null);
    }
  }

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${activeFarmId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("plant-images").upload(path, file);
    if (uploadError) throw uploadError;
    return supabase.storage.from("plant-images").getPublicUrl(path).data.publicUrl;
  }

  async function handleHeroFile(file: File | null) {
    if (!file) return;
    setUploading("hero");
    setError("");
    try {
      const url = await uploadImage(file);
      await postListing({ heroUrl: url }, t("Could not save the farm photo"));
      setHeroUrl(url);
    } catch (err) {
      setError(errMsg(err, t("Could not save the farm photo")));
    } finally {
      setUploading(null);
    }
  }

  async function handleCropFile(cropId: string, file: File | null) {
    if (!file) return;
    setUploading(cropId);
    setError("");
    try {
      const url = await uploadImage(file);
      const { error: updateError } = await supabase.from("crops").update({ produce_image_url: url }).eq("id", cropId);
      if (updateError) throw updateError;
      setCrops((current) => current.map((crop) => (crop.id === cropId ? { ...crop, produce_image_url: url } : crop)));
    } catch (err) {
      setError(errMsg(err, t("Could not save that photo")));
    } finally {
      setUploading(null);
    }
  }

  async function savePhotos() {
    setSaving("photos");
    setError("");
    try {
      // Prices typed on this step are saved together so one tap finishes the step.
      for (const crop of crops) {
        const typed = prices[crop.id] ?? "";
        const next = typed === "" ? null : Number(typed);
        const current = crop.expected_sale_price_per_kg ?? null;
        if (next !== current && (next === null || Number.isFinite(next))) {
          const { error: updateError } = await supabase.from("crops").update({ expected_sale_price_per_kg: next }).eq("id", crop.id);
          if (updateError) throw updateError;
        }
      }
      setCrops((current) => current.map((crop) => ({ ...crop, expected_sale_price_per_kg: prices[crop.id] === "" || prices[crop.id] === undefined ? null : Number(prices[crop.id]) })));
      setActiveStep(3);
    } catch (err) {
      setError(errMsg(err, t("Could not save prices")));
    } finally {
      setSaving(null);
    }
  }

  function captureCoordinates() {
    if (!navigator.geolocation) { setError(t("Location is not available on this device.")); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setCoordinates({ latitude: coords.latitude, longitude: coords.longitude }),
      () => setError(t("Could not read your position. Allow location access and try again."))
    );
  }

  async function saveSizeAndPosition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farm) return;
    const acres = Number(sizeAcres);
    if (!Number.isFinite(acres) || acres <= 0) return;
    setSaving("size");
    setError("");
    try {
      const { error: updateError } = await supabase.from("farms").update({ size_acres: acres }).eq("id", farm.id);
      if (updateError) throw updateError;
      setFarms((current) => current.map((item) => (item.id === farm.id ? { ...item, size_acres: acres } : item)));
      if (coordinates.latitude != null && coordinates.longitude != null) {
        await postListing(coordinates, t("Could not save the farm position"));
      }
      setActiveStep(4);
    } catch (err) {
      setError(errMsg(err, t("Could not save the farm size")));
    } finally {
      setSaving(null);
    }
  }

  const done = [
    practice.growingPractice !== "unspecified",
    !!fulfilment.contactPhone.trim(),
    !!heroUrl,
    !!farm?.size_acres,
  ];
  const stepCopy = useMemo(() => [
    { title: t("Growing practices"), detail: t("Tell buyers how you grow. This is your own declaration; a verified badge only appears once certification evidence is checked."), action: t("Choose your practice") },
    { title: t("Collection and delivery"), detail: t("How buyers reach you and how they get their produce."), action: t("Add contact details") },
    { title: t("Photos and prices"), detail: t("A farm photo, a picture of each produce and a price per kilogram."), action: t("Add photos") },
    { title: t("Farm size and position"), detail: t("The size in acres and where the farm is on the map."), action: t("Add size and position") },
  ], [t]);
  const steps = stepCopy.map((step, index) => ({ ...step, done: done[index] }));
  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);
  const firstOpen = steps.findIndex((step) => !step.done);
  const expanded = activeStep ?? (firstOpen === -1 ? 4 : firstOpen);

  if (loading && farms.length === 0) return <main className="mx-auto max-w-3xl px-4 py-12 text-sm text-zinc-500">{t("Loading your farm…")}</main>;

  const cropLabel = (crop: Crop) => (crop.variety ? `${crop.crop_name} · ${crop.variety}` : crop.crop_name);

  function stepCard(index: number, body: React.ReactNode) {
    const step = steps[index];
    const isOpen = expanded === index;
    return (
      <section id={`step-${index}`} className={"scroll-mt-6 rounded-2xl border bg-white p-5 shadow-sm transition " + (isOpen ? "border-emerald-300 ring-2 ring-emerald-100" : "border-zinc-200 hover:border-emerald-300")}>
        <button type="button" onClick={() => setActiveStep(index)} className="flex w-full gap-4 text-left">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">{step.done ? <Check className="h-4 w-4 text-emerald-700" /> : index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-semibold text-zinc-950">{step.title}{step.done && <span className="text-xs font-medium text-emerald-700">{t("Done")}</span>}</span>
            <span className="mt-1 block text-sm leading-6 text-zinc-600">{step.detail}</span>
            {!isOpen && <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">{step.done ? t("Review") : step.action}<ChevronRight className="h-4 w-4" /></span>}
          </span>
        </button>
        {isOpen && <div className="mt-4 sm:pl-12">{body}</div>}
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex justify-end">
        <LanguageToggle lang={lang} onChange={setLang} />
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{t("Prepare the farm")}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{t("Give buyers the full picture")}</h1>
          <p className="mt-2 max-w-2xl text-zinc-600">{t("Four short steps. Each one makes your shop more convincing, and you can come back any time.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {listed && slug && <Link href={`/${slug}`} className="inline-flex items-center gap-1 rounded-full border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">{t("Open shop")} <ExternalLink className="h-4 w-4" /></Link>}
          <Link href="/farm" className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">{t("Enter farm")} <ChevronRight className="h-4 w-4" /></Link>
        </div>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {farms.length > 1 && <label className="mb-6 block text-sm font-medium text-zinc-700">{t("Farm")}<select value={activeFarmId} onChange={(event) => setActiveFarmId(event.target.value)} className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-3">{farms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}

      {!farm ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <Leaf className="mx-auto h-8 w-8 text-emerald-700" />
          <h2 className="mt-3 text-xl font-semibold">{t("Set up your farm first")}</h2>
          <Link href="/farm/onboarding" className={"mt-5 inline-flex " + primaryButton}>{t("Go to farm setup")}</Link>
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-2xl bg-emerald-950 p-6 text-white">
            <div className="flex items-end justify-between gap-4"><div><p className="text-sm text-emerald-200">{farm.name}</p><p className="mt-1 text-2xl font-semibold">{completed} / {steps.length} {t("complete")}</p></div><span className="text-3xl font-semibold">{progress}%</span></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>
          </section>

          <div className="space-y-3">
            {/* Step 1: growing practices */}
            {stepCard(0, (
              <form onSubmit={savePractice} className="grid gap-4">
                <label className="text-sm font-medium text-zinc-700">{t("Growing approach")}
                  <select value={practice.growingPractice} onChange={(event) => setPractice((value) => ({ ...value, growingPractice: event.target.value }))} className={inputClass}>
                    <option value="unspecified">{t("Choose one")}</option>
                    <option value="organic_practices">{t("Organic practices (no synthetic inputs)")}</option>
                    <option value="regenerative">{t("Regenerative practices")}</option>
                    <option value="conventional">{t("Conventional farming")}</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-zinc-700">{t("How you grow")} <span className="font-normal text-zinc-400">({t("optional")})</span>
                  <textarea value={practice.practiceNotes} onChange={(event) => setPractice((value) => ({ ...value, practiceNotes: event.target.value }))} rows={3} placeholder={t("For example: compost inputs, pest controls, seed sources and what you do not use")} className={inputClass} />
                </label>
                <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                  <summary className="cursor-pointer font-medium text-zinc-800">{t("Certification evidence")} <span className="font-normal text-zinc-400">({t("optional")})</span></summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input value={practice.certificationBody} onChange={(event) => setPractice((value) => ({ ...value, certificationBody: event.target.value }))} placeholder={t("Certifying organisation")} className={inputClass} />
                    <input value={practice.certificationReference} onChange={(event) => setPractice((value) => ({ ...value, certificationReference: event.target.value }))} placeholder={t("Certificate reference")} className={inputClass} />
                    <input type="url" value={practice.certificationUrl} onChange={(event) => setPractice((value) => ({ ...value, certificationUrl: event.target.value }))} placeholder={t("Evidence link (https://…)")} className={inputClass} />
                    <input type="date" value={practice.certificationExpiresOn} onChange={(event) => setPractice((value) => ({ ...value, certificationExpiresOn: event.target.value }))} className={inputClass} />
                  </div>
                </details>
                <div>
                  <button type="submit" disabled={saving === "practice" || practice.growingPractice === "unspecified"} className={"w-full sm:w-auto " + primaryButton}>{saving === "practice" ? t("Saving…") : t("Save and continue")}</button>
                  {practice.growingPractice === "unspecified" && <p className="mt-2 text-xs text-zinc-500">{t("Choose a growing approach to continue.")}</p>}
                </div>
              </form>
            ))}

            {/* Step 2: collection and delivery */}
            {stepCard(1, (
              <form onSubmit={saveFulfilment} className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-zinc-700">{t("Phone or WhatsApp number")}<input required value={fulfilment.contactPhone} onChange={(event) => setFulfilment((value) => ({ ...value, contactPhone: event.target.value }))} placeholder="+255 7xx xxx xxx" className={inputClass} /></label>
                <label className="text-sm font-medium text-zinc-700">{t("How buyers get their produce")}
                  <select value={fulfilment.fulfilmentMethod} onChange={(event) => setFulfilment((value) => ({ ...value, fulfilmentMethod: event.target.value }))} className={inputClass}>
                    <option value="collection">{t("Collection from the farm")}</option>
                    <option value="delivery">{t("Delivery")}</option>
                    <option value="both">{t("Collection or delivery")}</option>
                  </select>
                </label>
                {fulfilment.fulfilmentMethod !== "delivery" && (
                  <label className="text-sm font-medium text-zinc-700 sm:col-span-2">{t("Collection instructions")} <span className="font-normal text-zinc-400">({t("optional")})</span><textarea value={fulfilment.collectionInstructions} onChange={(event) => setFulfilment((value) => ({ ...value, collectionInstructions: event.target.value }))} rows={2} placeholder={t("Where and when buyers can collect")} className={inputClass} /></label>
                )}
                {fulfilment.fulfilmentMethod !== "collection" && (
                  <label className="text-sm font-medium text-zinc-700 sm:col-span-2">{t("Delivery area")} <span className="font-normal text-zinc-400">({t("optional")})</span><textarea value={fulfilment.deliveryArea} onChange={(event) => setFulfilment((value) => ({ ...value, deliveryArea: event.target.value }))} rows={2} placeholder={t("Villages, towns or districts you deliver to")} className={inputClass} /></label>
                )}
                <div className="sm:col-span-2">
                  <button type="submit" disabled={saving === "fulfilment" || !fulfilment.contactPhone.trim()} className={"w-full sm:w-auto " + primaryButton}>{saving === "fulfilment" ? t("Saving…") : t("Save and continue")}</button>
                  {!fulfilment.contactPhone.trim() && <p className="mt-2 text-xs text-zinc-500">{t("A phone number is needed so buyers can reach you.")}</p>}
                </div>
              </form>
            ))}

            {/* Step 3: photos and prices */}
            {stepCard(2, (
              <div className="grid gap-5">
                <div>
                  <p className="text-sm font-medium text-zinc-700">{t("Farm photo")}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {heroUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroUrl} alt={t("Farm photo")} className="h-24 w-40 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-24 w-40 items-center justify-center rounded-xl border border-dashed border-zinc-300 text-xs text-zinc-400">{t("No photo yet")}</div>
                    )}
                    <input ref={heroInput} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0] ?? null; event.target.value = ""; handleHeroFile(file); }} />
                    <button type="button" onClick={() => heroInput.current?.click()} disabled={uploading === "hero"} className={secondaryButton}>{uploading === "hero" ? t("Uploading…") : heroUrl ? t("Swap photo") : t("Add photo")}</button>
                  </div>
                </div>

                {crops.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-zinc-700">{t("Produce photos and prices")}</p>
                    <ul className="mt-2 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                      {crops.map((crop) => (
                        <li key={crop.id} className="flex flex-wrap items-center gap-3 p-3">
                          {crop.produce_image_url || crop.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={crop.produce_image_url ?? crop.image_url ?? ""} alt={cropLabel(crop)} className="h-14 w-14 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-[10px] text-zinc-400">{t("No photo")}</div>
                          )}
                          <span className="min-w-0 flex-1 text-sm font-medium text-zinc-900">{cropLabel(crop)}</span>
                          <label className="text-xs text-zinc-500">{t("Price per kg")}<input type="number" min="0" step="0.01" value={prices[crop.id] ?? ""} onChange={(event) => setPrices((current) => ({ ...current, [crop.id]: event.target.value }))} className="mt-1 block w-28 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" /></label>
                          <label className={"cursor-pointer text-sm font-semibold text-emerald-800 " + (uploading === crop.id ? "opacity-50" : "")}>
                            {uploading === crop.id ? t("Uploading…") : crop.produce_image_url ? t("Swap photo") : t("Add photo")}
                            <input type="file" accept="image/*" className="hidden" disabled={uploading === crop.id} onChange={(event) => { const file = event.target.files?.[0] ?? null; event.target.value = ""; handleCropFile(crop.id, file); }} />
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <button type="button" onClick={savePhotos} disabled={saving === "photos"} className={"w-full sm:w-auto " + primaryButton}>{saving === "photos" ? t("Saving…") : t("Save and continue")}</button>
                  {!heroUrl && <p className="mt-2 text-xs text-zinc-500">{t("A farm photo makes the shop look real to buyers. You can continue without one.")}</p>}
                </div>
              </div>
            ))}

            {/* Step 4: size and position */}
            {stepCard(3, (
              <form onSubmit={saveSizeAndPosition} className="grid gap-4">
                <label className="text-sm font-medium text-zinc-700">{t("Farm size (acres)")}<input required type="number" min="0.01" step="0.01" value={sizeAcres} onChange={(event) => setSizeAcres(event.target.value)} placeholder="e.g. 2.5" className={inputClass} /></label>
                <div>
                  <p className="text-sm font-medium text-zinc-700">{t("Position on the map")} <span className="font-normal text-zinc-400">({t("optional")})</span></p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={captureCoordinates} className={secondaryButton}>{t("Use my current location")}</button>
                    {coordinates.latitude != null && coordinates.longitude != null && <span className="text-xs text-zinc-500">{coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}</span>}
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">{t("Stand on the farm and tap the button; buyers searching nearby will find you.")}</p>
                </div>
                <div>
                  <button type="submit" disabled={saving === "size" || Number(sizeAcres) <= 0} className={"w-full sm:w-auto " + primaryButton}>{saving === "size" ? t("Saving…") : t("Save and finish")}</button>
                  {Number(sizeAcres) <= 0 && <p className="mt-2 text-xs text-zinc-500">{t("Enter the farm size in acres to finish.")}</p>}
                </div>
              </form>
            ))}
          </div>

          {completed === steps.length && (
            <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-center gap-2 font-semibold text-emerald-950"><Check className="h-5 w-5" />{t("Your farm is fully prepared")}</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/farm" className={primaryButton}>{t("Enter farm")}</Link>
                {listed && slug && <Link href={`/${slug}`} className={secondaryButton}>{t("Open shop")}</Link>}
              </div>
            </section>
          )}

          <p className="mt-6 text-center text-sm"><Link href="/farm" className="text-zinc-500 hover:text-zinc-900 hover:underline">{t("Skip for now and go to the farm dashboard")}</Link></p>
        </>
      )}
    </main>
  );
}
