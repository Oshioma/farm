"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, ExternalLink, Pencil, Sprout } from "lucide-react";
import {
  getCrops,
  getFarms,
  getHarvestEta,
  saveActiveFarmId,
  HARVEST_MONTHS,
  harvestMonthKeyFor,
  harvestSeasonYear,
} from "@/lib/farm";
import type { Crop, Farm, HarvestEtaEntry } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { supabase } from "@/lib/supabase";

type Listing = { listed: boolean; slug: string | null; heroUrl: string | null; available: boolean };

const copy = {
  en: {
    eyebrow: "Farmer setup", title: "Open your farm shop",
    intro: "Two short steps. Your shop opens as soon as your first crop is in.",
    back: "Enter farm", farm: "Farm", checking: "Checking your farm setup…",
    createTitle: "Name your farm to begin", createBody: "Then add what you are growing and your shop opens.", create: "Create farm", creating: "Creating…",
    joinInstead: "Joining a farm that already exists? Request access instead",
    complete: "complete", done: "Done", review: "Review", continue: "Continue",
    farmName: "Farm name", location: "Location", saveDetails: "Save and continue", savingDetails: "Saving…",
    changeName: "Change name", keepName: "Keep this name",
    locationPlaceholder: "Village, district or region",
    cropName: "Crop name", variety: "Variety", expectedHarvestStart: "Expected harvest date", expectedKg: "Expected kilograms", pricePerKg: "Expected price per kg",
    optional: "optional", addCrop: "Add crop and go to shop", addingCrop: "Adding crop and opening your shop…", cropsSoFar: "Crops on this farm", addAnotherCrop: "Add another crop", kg: "kg",
    cropPlaceholder: "e.g. Tomatoes", varietyPlaceholder: "e.g. Roma",
    openShop: "Continue to my shop", opening: "Opening your shop…", openShopBody: "Your shop goes live and buyers can reserve the crops above. You can add photos, prices and delivery details afterwards.",
    detailsHint: "Add a location to continue.",
    cropHint: "Crop name, expected harvest date and expected kilograms are needed.",
    skip: "Skip setup for now and go to the farm dashboard",
    live: "Your shop is live", open: "Open shop",
    steps: [
      ["Farm name and location", "", "Add farm name and location"],
      ["Add your crops", "What is growing, when it should be ready, and how much you expect to harvest.", "Add a crop"],
    ],
  },
  sw: {
    eyebrow: "Maandalizi ya mkulima", title: "Fungua duka la shamba lako",
    intro: "Hatua mbili fupi. Duka lako linafunguka mara tu zao lako la kwanza likiingizwa.",
    back: "Ingia shambani", farm: "Shamba", checking: "Tunakagua maandalizi ya shamba lako…",
    createTitle: "Anza kwa kulipa jina shamba lako", createBody: "Kisha ongeza unacholima na duka lako litafunguka.", create: "Unda shamba", creating: "Inaunda…",
    joinInstead: "Unajiunga na shamba lililopo? Omba ruhusa badala yake",
    complete: "zimekamilika", done: "Imekamilika", review: "Kagua", continue: "Endelea",
    farmName: "Jina la shamba", location: "Eneo", saveDetails: "Hifadhi na uendelee", savingDetails: "Inahifadhi…",
    changeName: "Badilisha jina", keepName: "Baki na jina hili",
    locationPlaceholder: "Kijiji, wilaya au mkoa",
    cropName: "Jina la zao", variety: "Aina", expectedHarvestStart: "Tarehe ya mavuno inayotarajiwa", expectedKg: "Kilo zinazotarajiwa", pricePerKg: "Bei inayotarajiwa kwa kilo",
    optional: "hiari", addCrop: "Ongeza zao na uende dukani", addingCrop: "Inaongeza zao na kufungua duka lako…", cropsSoFar: "Mazao ya shamba hili", addAnotherCrop: "Ongeza zao lingine", kg: "kg",
    cropPlaceholder: "mf. Nyanya", varietyPlaceholder: "mf. Roma",
    openShop: "Endelea kwenye duka langu", opening: "Inafungua duka lako…", openShopBody: "Duka lako linaingia hewani na wanunuzi wanaweza kuagiza mazao yaliyo hapo juu. Unaweza kuongeza picha, bei na maelezo ya usafirishaji baadaye.",
    detailsHint: "Weka eneo ili kuendelea.",
    cropHint: "Jina la zao, tarehe ya mavuno inayotarajiwa na kilo zinazotarajiwa vinahitajika.",
    skip: "Ruka maandalizi kwa sasa na uende kwenye dashibodi ya shamba",
    live: "Duka lako liko hewani", open: "Fungua duka",
    steps: [
      ["Jina na eneo la shamba", "", "Weka jina na eneo la shamba"],
      ["Ongeza mazao yako", "Kinacholimwa, kitakapokuwa tayari, na kiasi unachotarajia kuvuna.", "Ongeza zao"],
    ],
  },
} as const;

const inputClass = "mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const primaryButton = "rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "rounded-full border border-emerald-700 px-5 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50";

const blankCrop = { name: "", variety: "", expectedHarvestStart: "", expectedKg: "", pricePerKg: "" };

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) return String((err as { message: unknown }).message);
  return fallback;
}

/** Sum of the expected kilograms recorded on one harvest sheet row. */
function expectedTotal(row: HarvestEtaEntry): number {
  return HARVEST_MONTHS.reduce((sum, m) => sum + (Number(row[`${m.key}_expected` as keyof HarvestEtaEntry]) || 0), 0);
}

export default function FarmerOnboardingPage() {
  const router = useRouter();
  const [lang, setLang] = useLanguage();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [crops, setCrops] = useState<Crop[]>([]);
  const [harvests, setHarvests] = useState<HarvestEtaEntry[]>([]);
  const [listing, setListing] = useState<Listing>({ listed: false, slug: null, heroUrl: null, available: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /* Which step card is expanded. null = not decided yet (set once data loads). */
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const [newFarmName, setNewFarmName] = useState("");
  const [creatingFarm, setCreatingFarm] = useState(false);

  const [detailsForm, setDetailsForm] = useState({ name: "", location: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  /* The farm name is shown as text; the input only appears on "Change name". */
  const [editingName, setEditingName] = useState(false);

  const [cropForm, setCropForm] = useState(blankCrop);
  const [savingCrop, setSavingCrop] = useState(false);
  /* After the first crop the form folds away behind "Add another crop". */
  const [showCropForm, setShowCropForm] = useState(false);

  const [opening, setOpening] = useState(false);

  const seasonYear = harvestSeasonYear();

  useFarmSelection({ farms, activeFarmId, setActiveFarmId });

  useEffect(() => {
    getFarms().then(setFarms).catch((err) => setError(errMsg(err, "Could not load farms"))).finally(() => setLoading(false));
  }, []);

  async function loadFarmProgress(farmId: string) {
    const [cropRows, harvestRows, shop] = await Promise.all([
      getCrops(farmId),
      getHarvestEta(farmId, [seasonYear, seasonYear + 1]),
      fetch(`/api/farm/market-listing?farm_id=${encodeURIComponent(farmId)}`).then((res) => res.json()),
    ]);
    return { cropRows, harvestRows, shop };
  }

  useEffect(() => {
    if (!activeFarmId) return;
    let cancelled = false;
    setLoading(true);
    loadFarmProgress(activeFarmId).then(({ cropRows, harvestRows, shop }) => {
      if (cancelled) return;
      setCrops(cropRows);
      setHarvests(harvestRows);
      setShowCropForm(cropRows.length === 0);
      setListing({ listed: !!shop.listed, slug: shop.slug ?? null, heroUrl: shop.heroUrl ?? null, available: shop.available !== false });
    }).catch((err) => {
      if (!cancelled) setError(errMsg(err, "Could not check setup"));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFarmId]);

  const t = copy[lang];
  const farm = farms.find((item) => item.id === activeFarmId) ?? null;

  useEffect(() => {
    if (!farm) return;
    setDetailsForm({ name: farm.name, location: farm.location ?? "" });
    setEditingName(false);
    setActiveStep(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farm?.id]);

  /* Bring the newly opened step into view once it has rendered. */
  useEffect(() => {
    if (activeStep === null) return;
    document.getElementById(`step-${activeStep}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeStep]);

  function goToStep(index: number) {
    setActiveStep(index);
  }

  async function createFarm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newFarmName.trim();
    if (!name) return;
    setCreatingFarm(true);
    setError("");
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data: farmId, error: rpcError } = await supabase.rpc("create_farm_with_owner", { p_name: name, p_slug: slug });
      if (rpcError) throw rpcError;
      if (!farmId) throw new Error("The farm was not created.");
      await saveActiveFarmId(farmId);
      setFarms(await getFarms());
      setActiveFarmId(farmId);
      setNewFarmName("");
    } catch (err) {
      setError(errMsg(err, "Failed to create farm"));
    } finally {
      setCreatingFarm(false);
    }
  }

  async function saveFarmDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farm) return;
    const name = detailsForm.name.trim();
    const location = detailsForm.location.trim();
    if (!name || !location) return;

    setSavingDetails(true);
    setError("");
    // Farm size is collected later in the prepare-farm wizard, not here.
    const { error: updateError } = await supabase
      .from("farms")
      .update({ name, location })
      .eq("id", farm.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setFarms((current) => current.map((item) => item.id === farm.id ? { ...item, name, location } : item));
      setEditingName(false);
      goToStep(1);
    }
    setSavingDetails(false);
  }

  /* One form records the crop and its harvest estimate together, so the
     farmer is not asked for the harvest date and weight twice. */
  async function addCrop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farm) return;
    const cropName = cropForm.name.trim();
    const kg = Number(cropForm.expectedKg);
    if (!cropName || !cropForm.expectedHarvestStart || !Number.isFinite(kg) || kg <= 0) return;

    setSavingCrop(true);
    setError("");
    try {
      const { data: inserted, error: insertError } = await supabase.from("crops").insert({
        farm_id: farm.id,
        zone_id: null,
        extra_zone_ids: null,
        crop_name: cropName,
        variety: cropForm.variety.trim() || null,
        status: "planned",
        planted_on: null,
        expected_harvest_start: cropForm.expectedHarvestStart,
        estimated_yield_kg: kg,
        expected_sale_price_per_kg: cropForm.pricePerKg ? Number(cropForm.pricePerKg) : null,
        is_active: true,
      }).select("id").single();
      if (insertError) throw insertError;

      const harvestSeason = harvestSeasonYear(cropForm.expectedHarvestStart);
      const monthColumn = `${harvestMonthKeyFor(cropForm.expectedHarvestStart)}_expected`;
      const { error: harvestError } = await supabase.from("harvest_eta").insert({
        farm_id: farm.id,
        year: harvestSeason,
        bed_name: cropForm.variety.trim() ? `${cropName} · ${cropForm.variety.trim()}` : cropName,
        crop_id: inserted.id,
        zone_id: null,
        main_crop: cropName,
        expected_harvest_date: cropForm.expectedHarvestStart,
        [monthColumn]: String(kg),
      });
      if (harvestError) throw harvestError;

      await supabase.from("activities").insert({
        farm_id: farm.id,
        type: "crop_created",
        title: `${cropName} added`,
        meta: "Crop created during setup",
      });

      const [cropRows, harvestRows] = await Promise.all([getCrops(farm.id), getHarvestEta(farm.id, [seasonYear, seasonYear + 1])]);
      setCrops(cropRows);
      setHarvests(harvestRows);
      setCropForm(blankCrop);
      setShowCropForm(false);
      /* The first save goes straight to the shop; no second click needed. */
      if (listing.slug) await openShop();
    } catch (err) {
      setError(errMsg(err, "Failed to add crop"));
    } finally {
      setSavingCrop(false);
    }
  }

  /* Publishes the shop (if it is not already) and takes the farmer to it. */
  async function openShop() {
    if (!farm || !listing.slug) return;
    setOpening(true);
    setError("");
    try {
      if (!listing.listed) {
        const res = await fetch("/api/farm/market-listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ farmId: farm.id, listed: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not open the shop");
        setListing((current) => ({ ...current, listed: true }));
      }
      router.push(`/${listing.slug}`);
    } catch (err) {
      setError(errMsg(err, "Could not open the shop"));
      setOpening(false);
    }
  }

  const hasCrop = crops.length > 0 && harvests.some((row) => expectedTotal(row) > 0);
  const done = [!!farm?.location, hasCrop];

  const steps = useMemo(() => t.steps.map((step, index) => ({
    title: step[0], detail: step[1], action: step[2], done: done[index],
  })), [t, farm, hasCrop]); // eslint-disable-line react-hooks/exhaustive-deps

  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);
  const firstOpen = steps.findIndex((step) => !step.done);
  const expanded = activeStep ?? (firstOpen === -1 ? 1 : firstOpen);

  if (loading && farms.length === 0) return <main className="mx-auto max-w-3xl px-4 py-12 text-sm text-zinc-500">{t.checking}</main>;

  const cropLabel = (crop: Crop) => (crop.variety ? `${crop.crop_name} · ${crop.variety}` : crop.crop_name);
  const expectedKgFor = (cropId: string) => harvests.filter((row) => row.crop_id === cropId).reduce((sum, row) => sum + expectedTotal(row), 0);
  const cropFormReady = !!cropForm.name.trim() && !!cropForm.expectedHarvestStart && Number(cropForm.expectedKg) > 0;

  function stepHeader(index: number) {
    const step = steps[index];
    const isOpen = expanded === index;
    return (
      <button type="button" onClick={() => goToStep(index)} className="flex w-full gap-4 text-left">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">{step.done ? <Check className="h-4 w-4 text-emerald-700" /> : index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-semibold text-zinc-950">{step.title}{step.done && <span className="text-xs font-medium text-emerald-700">{t.done}</span>}</span>
          {step.detail && <span className="mt-1 block text-sm leading-6 text-zinc-600">{step.detail}</span>}
          {!isOpen && <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">{step.done ? t.review : step.action}<ChevronRight className="h-4 w-4" /></span>}
        </span>
      </button>
    );
  }

  function stepCard(index: number, body: React.ReactNode) {
    const isOpen = expanded === index;
    return (
      <section id={`step-${index}`} className={"scroll-mt-6 rounded-2xl border bg-white p-5 shadow-sm transition " + (isOpen ? "border-emerald-300 ring-2 ring-emerald-100" : "border-zinc-200 hover:border-emerald-300")}>
        {stepHeader(index)}
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{t.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{t.title}</h1>
          <p className="mt-2 max-w-2xl text-zinc-600">{t.intro}</p>
        </div>
        {listing.listed && listing.slug && <Link href={`/${listing.slug}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">{t.open} <ExternalLink className="h-4 w-4" /></Link>}
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {farms.length > 1 && <label className="mb-6 block text-sm font-medium text-zinc-700">{t.farm}<select value={activeFarmId} onChange={(event) => setActiveFarmId(event.target.value)} className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-3">{farms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}

      {!farm ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <Sprout className="mx-auto h-8 w-8 text-emerald-700" />
          <h2 className="mt-3 text-center text-xl font-semibold">{t.createTitle}</h2>
          <p className="mt-2 text-center text-sm text-zinc-600">{t.createBody}</p>
          <form onSubmit={createFarm} className="mx-auto mt-6 max-w-sm">
            <label className="text-sm font-medium text-zinc-700">{t.farmName}<input required autoFocus value={newFarmName} onChange={(event) => setNewFarmName(event.target.value)} className={inputClass} /></label>
            <button type="submit" disabled={creatingFarm || !newFarmName.trim()} className={"mt-4 w-full " + primaryButton}>{creatingFarm ? t.creating : t.create}</button>
          </form>
          <p className="mt-5 text-center text-sm"><Link href="/farm?join=1" className="font-medium text-emerald-800 hover:underline">{t.joinInstead}</Link></p>
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-2xl bg-emerald-950 p-6 text-white">
            <div className="flex items-end justify-between gap-4"><div><p className="text-sm text-emerald-200">{farm.name}</p><p className="mt-1 text-2xl font-semibold">{completed} / {steps.length} {t.complete}</p></div><span className="text-3xl font-semibold">{progress}%</span></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>
          </section>

          <div className="space-y-3">
            {/* Step 1: farm name and location */}
            {stepCard(0, (
              <form onSubmit={saveFarmDetails} className="grid gap-4">
                {editingName ? (
                  <div>
                    <label className="text-sm font-medium text-zinc-700">{t.farmName}<input required autoFocus value={detailsForm.name} onChange={(event) => setDetailsForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} /></label>
                    <button type="button" onClick={() => { setDetailsForm((current) => ({ ...current, name: farm.name })); setEditingName(false); }} className="mt-2 text-sm font-semibold text-emerald-800 hover:underline">{t.keepName}</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <p className="text-2xl font-bold tracking-tight text-zinc-950">{detailsForm.name || farm.name}</p>
                    <button type="button" onClick={() => setEditingName(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline"><Pencil className="h-3.5 w-3.5" />{t.changeName}</button>
                  </div>
                )}
                <label className="text-sm font-medium text-zinc-700">{t.location}<input required value={detailsForm.location} onChange={(event) => setDetailsForm((current) => ({ ...current, location: event.target.value }))} placeholder={t.locationPlaceholder} className={inputClass} /></label>
                <div>
                  <button type="submit" disabled={savingDetails || !detailsForm.name.trim() || !detailsForm.location.trim()} className={"w-full sm:w-auto " + primaryButton}>{savingDetails ? t.savingDetails : t.saveDetails}</button>
                  {(!detailsForm.name.trim() || !detailsForm.location.trim()) && <p className="mt-2 text-xs text-zinc-500">{t.detailsHint}</p>}
                </div>
              </form>
            ))}

            {/* Step 2: crops with their harvest estimate, then straight to the shop */}
            {stepCard(1, (
              <div>
                {crops.length > 0 && (
                  <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{t.cropsSoFar}</p>
                    <ul className="mt-2 space-y-1 text-sm text-zinc-800">
                      {crops.map((crop) => (
                        <li key={crop.id} className="flex flex-wrap items-center gap-x-3">
                          <span className="font-medium">{cropLabel(crop)}</span>
                          {crop.expected_harvest_start && <span className="text-zinc-500">{crop.expected_harvest_start}</span>}
                          {expectedKgFor(crop.id) > 0 && <span className="text-zinc-500">{expectedKgFor(crop.id)} {t.kg}</span>}
                          {crop.expected_sale_price_per_kg != null && <span className="text-zinc-500">{crop.expected_sale_price_per_kg}/{t.kg}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {showCropForm || crops.length === 0 ? (
                  <form onSubmit={addCrop} className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-zinc-700">{t.cropName}<input required value={cropForm.name} onChange={(event) => setCropForm((current) => ({ ...current, name: event.target.value }))} placeholder={t.cropPlaceholder} className={inputClass} /></label>
                    <label className="text-sm font-medium text-zinc-700">{t.variety} <span className="font-normal text-zinc-400">({t.optional})</span><input value={cropForm.variety} onChange={(event) => setCropForm((current) => ({ ...current, variety: event.target.value }))} placeholder={t.varietyPlaceholder} className={inputClass} /></label>
                    <label className="text-sm font-medium text-zinc-700">{t.expectedHarvestStart}<input required type="date" value={cropForm.expectedHarvestStart} onChange={(event) => setCropForm((current) => ({ ...current, expectedHarvestStart: event.target.value }))} className={inputClass} /></label>
                    <label className="text-sm font-medium text-zinc-700">{t.expectedKg}<input required type="number" min="0.1" step="0.1" value={cropForm.expectedKg} onChange={(event) => setCropForm((current) => ({ ...current, expectedKg: event.target.value }))} className={inputClass} /></label>
                    <label className="text-sm font-medium text-zinc-700">{t.pricePerKg} <span className="font-normal text-zinc-400">({t.optional})</span><input type="number" min="0" step="0.01" value={cropForm.pricePerKg} onChange={(event) => setCropForm((current) => ({ ...current, pricePerKg: event.target.value }))} className={inputClass} /></label>
                    <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                      <button type="submit" disabled={savingCrop || opening || !cropFormReady} className={primaryButton}>{savingCrop || opening ? t.addingCrop : t.addCrop}<ChevronRight className="ml-1 inline h-4 w-4" /></button>
                      {crops.length > 0 && <button type="button" onClick={() => setShowCropForm(false)} className={secondaryButton}>{t.continue}</button>}
                    </div>
                    {!cropFormReady && <p className="text-xs text-zinc-500 sm:col-span-2">{t.cropHint}</p>}
                  </form>
                ) : (
                  <div>
                    <p className="text-sm leading-6 text-zinc-600">{t.openShopBody}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button type="button" onClick={() => setShowCropForm(true)} className={secondaryButton}>{t.addAnotherCrop}</button>
                      <button type="button" onClick={openShop} disabled={opening || !hasCrop || !listing.slug} className={primaryButton}>{opening ? t.opening : t.openShop}<ChevronRight className="ml-1 inline h-4 w-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {listing.listed && (
            <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><div className="flex items-center gap-2 font-semibold text-emerald-950"><Check className="h-5 w-5" />{t.live}</div>{listing.slug && <Link href={`/${listing.slug}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">{t.open} <ExternalLink className="h-4 w-4" /></Link>}</section>
          )}

          <p className="mt-6 text-center text-sm"><Link href="/farm" className="text-zinc-500 hover:text-zinc-900 hover:underline">{t.skip}</Link></p>
        </>
      )}
    </main>
  );
}
