"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Circle, ExternalLink, Languages, Sprout } from "lucide-react";
import {
  getCrops,
  getFarms,
  getHarvestEta,
  saveActiveFarmId,
  HARVEST_MONTHS,
  harvestMonthYear,
  harvestSeasonYear,
} from "@/lib/farm";
import type { Crop, Farm, HarvestEtaEntry, HarvestMonthKey } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { supabase } from "@/lib/supabase";

type Lang = "en" | "sw";
type Listing = { listed: boolean; slug: string | null; heroUrl: string | null; available: boolean };

const copy = {
  en: {
    eyebrow: "Farmer setup", title: "Get ready to take real orders",
    intro: "Work through this once. You can return any time and Shamba will recognise what is already complete.",
    back: "Enter farm", farm: "Farm", checking: "Checking your farm setup…",
    createTitle: "Name your farm to begin", createBody: "This guide then takes you from the first crop to a public shop.", create: "Create farm", creating: "Creating…",
    joinInstead: "Joining a farm that already exists? Request access instead",
    complete: "complete", done: "Done", review: "Review", continue: "Continue", edit: "Edit",
    farmName: "Farm name", location: "Location", acreage: "Farm size (acres)", saveDetails: "Save and continue", savingDetails: "Saving…",
    detailsSaved: "Farm details saved.", locationPlaceholder: "Village, district or region", acreagePlaceholder: "e.g. 2.5",
    cropName: "Crop name", variety: "Variety", plantedOn: "Planted on", expectedHarvestStart: "Expected harvest date", pricePerKg: "Expected price per kg", yieldKg: "Estimated yield (kg)",
    optional: "optional", addCrop: "Add crop", addingCrop: "Adding…", cropAdded: "Crop added. Add another or continue.", cropsSoFar: "Crops on this farm", continueHarvest: "Continue to harvest estimate",
    chooseCrop: "Crop", harvestMonth: "Harvest month", expectedKg: "Expected kilograms", saveHarvest: "Save estimate", savingHarvest: "Saving…", harvestSaved: "Harvest estimate saved.", estimatesSoFar: "Estimates so far", continueShop: "Continue to the shop", kg: "kg",
    skip: "Skip setup for now and go to the farm dashboard",
    live: "Your shop is live", open: "Open public shop",
    privacy: "Publishing stays off until you choose it. Buyers cannot find an unfinished shop.",
    cropPlaceholder: "e.g. Tomatoes", varietyPlaceholder: "e.g. Roma",
    steps: [
      ["Describe your farm", "Add a location and farm size so buyers know where their food is grown.", "Add farm details"],
      ["Add your first crop", "Record what is in the ground, the variety, planting date and expected price.", "Add a crop"],
      ["Estimate the harvest", "Say which month it should be ready and roughly how many kilograms you expect.", "Add expected harvest"],
      ["Prepare the shop", "Add a farm photo, produce photo and price before publishing.", "Prepare shop"],
      ["Publish when ready", "Turn on the public listing only after the crop and harvest details look right.", "Review and publish"],
    ],
  },
  sw: {
    eyebrow: "Maandalizi ya mkulima", title: "Jiandae kupokea oda halisi",
    intro: "Fuata hatua hizi mara moja. Unaweza kurudi wakati wowote, na Shamba itatambua hatua ulizokamilisha.",
    back: "Ingia shambani", farm: "Shamba", checking: "Tunakagua maandalizi ya shamba lako…",
    createTitle: "Anza kwa kulipa jina shamba lako", createBody: "Kisha mwongozo huu utakusaidia kutoka zao la kwanza hadi duka la umma.", create: "Unda shamba", creating: "Inaunda…",
    joinInstead: "Unajiunga na shamba lililopo? Omba ruhusa badala yake",
    complete: "zimekamilika", done: "Imekamilika", review: "Kagua", continue: "Endelea", edit: "Hariri",
    farmName: "Jina la shamba", location: "Eneo", acreage: "Ukubwa wa shamba (ekari)", saveDetails: "Hifadhi na uendelee", savingDetails: "Inahifadhi…",
    detailsSaved: "Taarifa za shamba zimehifadhiwa.", locationPlaceholder: "Kijiji, wilaya au mkoa", acreagePlaceholder: "mf. 2.5",
    cropName: "Jina la zao", variety: "Aina", plantedOn: "Tarehe ya kupanda", expectedHarvestStart: "Tarehe ya mavuno inayotarajiwa", pricePerKg: "Bei inayotarajiwa kwa kilo", yieldKg: "Kadirio la mavuno (kg)",
    optional: "hiari", addCrop: "Ongeza zao", addingCrop: "Inaongeza…", cropAdded: "Zao limeongezwa. Ongeza lingine au endelea.", cropsSoFar: "Mazao ya shamba hili", continueHarvest: "Endelea kwenye kadirio la mavuno",
    chooseCrop: "Zao", harvestMonth: "Mwezi wa kuvuna", expectedKg: "Kilo zinazotarajiwa", saveHarvest: "Hifadhi kadirio", savingHarvest: "Inahifadhi…", harvestSaved: "Kadirio la mavuno limehifadhiwa.", estimatesSoFar: "Makadirio yaliyopo", continueShop: "Endelea kwenye duka", kg: "kg",
    skip: "Ruka maandalizi kwa sasa na uende kwenye dashibodi ya shamba",
    live: "Duka lako sasa liko hewani", open: "Fungua duka la umma",
    privacy: "Duka halitawekwa hadharani mpaka uchague kufanya hivyo. Wanunuzi hawawezi kuona duka ambalo halijakamilika.",
    cropPlaceholder: "mf. Nyanya", varietyPlaceholder: "mf. Roma",
    steps: [
      ["Elezea shamba lako", "Weka eneo na ukubwa wa shamba ili wanunuzi wajue chakula chao kinalimwa wapi.", "Weka taarifa za shamba"],
      ["Ongeza zao lako la kwanza", "Andika zao lililopandwa, aina yake, tarehe ya kupanda na bei inayotarajiwa.", "Ongeza zao"],
      ["Kadiria mavuno", "Chagua mwezi wa kuvuna na kadirio la kilo unazotarajia kupata.", "Weka mavuno yanayotarajiwa"],
      ["Andaa duka", "Weka picha ya shamba, picha ya mazao na bei kabla ya kuchapisha.", "Andaa duka"],
      ["Chapisha ukiwa tayari", "Weka duka hadharani baada ya kukagua mazao na makadirio ya mavuno.", "Kagua na uchapishe"],
    ],
  },
} as const;

const inputClass = "mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const primaryButton = "rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "rounded-full border border-emerald-700 px-5 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50";

const blankCrop = { name: "", variety: "", plantedOn: "", expectedHarvestStart: "", pricePerKg: "", yieldKg: "" };

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
  const [lang, setLang] = useState<Lang>("en");
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

  const [detailsForm, setDetailsForm] = useState({ name: "", location: "", sizeAcres: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState("");

  const [cropForm, setCropForm] = useState(blankCrop);
  const [savingCrop, setSavingCrop] = useState(false);
  const [cropMessage, setCropMessage] = useState("");

  const seasonYear = harvestSeasonYear();
  const currentMonthKey: HarvestMonthKey = HARVEST_MONTHS.find((m) => m.month === new Date().getMonth() + 1)?.key ?? "mar";
  const [harvestForm, setHarvestForm] = useState<{ cropId: string; month: HarvestMonthKey; kg: string }>({ cropId: "", month: currentMonthKey, kg: "" });
  const [savingHarvest, setSavingHarvest] = useState(false);
  const [harvestMessage, setHarvestMessage] = useState("");

  useFarmSelection({ farms, activeFarmId, setActiveFarmId });

  useEffect(() => {
    const saved = window.localStorage.getItem("shamba_onboarding_language");
    const preferred: Lang = saved === "sw" || (!saved && navigator.language.toLowerCase().startsWith("sw")) ? "sw" : "en";
    setLang(preferred);
    getFarms().then(setFarms).catch((err) => setError(errMsg(err, "Could not load farms"))).finally(() => setLoading(false));
  }, []);

  function chooseLanguage(value: Lang) {
    setLang(value);
    window.localStorage.setItem("shamba_onboarding_language", value);
  }

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
    setDetailsForm({
      name: farm.name,
      location: farm.location ?? "",
      sizeAcres: farm.size_acres?.toString() ?? "",
    });
    setDetailsMessage("");
    setCropMessage("");
    setHarvestMessage("");
    setActiveStep(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farm?.id]);

  /* Default the harvest form to the first crop without an estimate. */
  useEffect(() => {
    if (harvestForm.cropId && crops.some((crop) => crop.id === harvestForm.cropId)) return;
    const estimated = new Set(harvests.filter((row) => expectedTotal(row) > 0).map((row) => row.crop_id));
    const candidate = crops.find((crop) => !estimated.has(crop.id)) ?? crops[0];
    if (candidate) setHarvestForm((current) => ({ ...current, cropId: candidate.id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crops, harvests]);

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
      const farmRows = await getFarms();
      setFarms(farmRows);
      setActiveFarmId(farmId);
      setNewFarmName("");
    } catch (err) {
      setError(errMsg(err, "Failed to create farm"));
    } finally {
      setCreatingFarm(false);
    }
  }

  function goToStep(index: number) {
    setActiveStep(index);
    window.setTimeout(() => {
      document.getElementById(`step-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function saveFarmDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farm) return;
    const name = detailsForm.name.trim();
    const location = detailsForm.location.trim();
    const sizeAcres = Number(detailsForm.sizeAcres);
    if (!name || !location || !Number.isFinite(sizeAcres) || sizeAcres <= 0) return;

    setSavingDetails(true);
    setError("");
    setDetailsMessage("");
    const { error: updateError } = await supabase
      .from("farms")
      .update({ name, location, size_acres: sizeAcres })
      .eq("id", farm.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setFarms((current) => current.map((item) => item.id === farm.id
        ? { ...item, name, location, size_acres: sizeAcres }
        : item));
      setDetailsMessage(t.detailsSaved);
      goToStep(1);
    }
    setSavingDetails(false);
  }

  async function addCrop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farm) return;
    const cropName = cropForm.name.trim();
    if (!cropName) return;

    setSavingCrop(true);
    setError("");
    setCropMessage("");
    try {
      const { error: insertError } = await supabase.from("crops").insert({
        farm_id: farm.id,
        zone_id: null,
        extra_zone_ids: null,
        crop_name: cropName,
        variety: cropForm.variety.trim() || null,
        status: cropForm.plantedOn ? "planted" : "planned",
        planted_on: cropForm.plantedOn || null,
        expected_harvest_start: cropForm.expectedHarvestStart || null,
        estimated_yield_kg: cropForm.yieldKg ? Number(cropForm.yieldKg) : null,
        expected_sale_price_per_kg: cropForm.pricePerKg ? Number(cropForm.pricePerKg) : null,
        is_active: true,
      });
      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: farm.id,
        type: "crop_created",
        title: `${cropName} added`,
        meta: "Crop created during setup",
      });

      setCrops(await getCrops(farm.id));
      setCropForm(blankCrop);
      setCropMessage(t.cropAdded);
    } catch (err) {
      setError(errMsg(err, "Failed to add crop"));
    } finally {
      setSavingCrop(false);
    }
  }

  async function saveHarvestEstimate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farm) return;
    const crop = crops.find((item) => item.id === harvestForm.cropId);
    const kg = Number(harvestForm.kg);
    if (!crop || !Number.isFinite(kg) || kg <= 0) return;

    setSavingHarvest(true);
    setError("");
    setHarvestMessage("");
    try {
      const monthColumn = `${harvestForm.month}_expected`;
      const existing = harvests.find((row) => row.crop_id === crop.id && row.year === seasonYear);
      if (existing) {
        const { error: updateError } = await supabase
          .from("harvest_eta")
          .update({ [monthColumn]: String(kg) })
          .eq("id", existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("harvest_eta").insert({
          farm_id: farm.id,
          year: seasonYear,
          bed_name: crop.variety ? `${crop.crop_name} · ${crop.variety}` : crop.crop_name,
          crop_id: crop.id,
          zone_id: crop.zone_id ?? null,
          main_crop: crop.crop_name,
          expected_harvest_date: crop.expected_harvest_start,
          [monthColumn]: String(kg),
        });
        if (insertError) throw insertError;
      }

      setHarvests(await getHarvestEta(farm.id, [seasonYear, seasonYear + 1]));
      setHarvestForm((current) => ({ ...current, kg: "" }));
      setHarvestMessage(t.harvestSaved);
    } catch (err) {
      setError(errMsg(err, "Failed to save harvest estimate"));
    } finally {
      setSavingHarvest(false);
    }
  }

  const hasCrop = crops.length > 0;
  const hasHarvest = harvests.some((row) => expectedTotal(row) > 0);
  const hasShopDetails = !!listing.heroUrl && crops.some((crop) => crop.expected_sale_price_per_kg && (crop.produce_image_url || crop.image_url));
  const done = [!!farm?.location && !!farm?.size_acres, hasCrop, hasHarvest, hasShopDetails, listing.listed];
  const hrefs = [null, null, null, "/farm/settings#public-shop", "/farm/settings#public-shop"];

  const steps = useMemo(() => t.steps.map((step, index) => ({
    title: step[0], detail: step[1], action: step[2], href: hrefs[index], done: done[index],
  })), [t, farm, hasCrop, hasHarvest, hasShopDetails, listing.listed]); // eslint-disable-line react-hooks/exhaustive-deps

  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);
  const firstOpen = steps.findIndex((step) => !step.done);
  const expanded = activeStep ?? (firstOpen === -1 ? null : firstOpen);
  const next = steps.find((step) => !step.done);
  const nextIndex = next ? steps.indexOf(next) : -1;

  if (loading && farms.length === 0) return <main className="mx-auto max-w-3xl px-4 py-12 text-sm text-zinc-500">{t.checking}</main>;

  const monthOptions = HARVEST_MONTHS.map((m) => ({ key: m.key, label: `${m.label} ${harvestMonthYear(m.key, seasonYear)}` }));
  const cropNameById = new Map(crops.map((crop) => [crop.id, crop.variety ? `${crop.crop_name} · ${crop.variety}` : crop.crop_name]));

  function stepHeader(index: number) {
    const step = steps[index];
    const isOpen = expanded === index;
    return (
      <button type="button" onClick={() => goToStep(index)} className="flex w-full gap-4 text-left">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">{step.done ? <Check className="h-4 w-4 text-emerald-700" /> : index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-semibold text-zinc-950">{step.title}{step.done && <span className="text-xs font-medium text-emerald-700">{t.done}</span>}</span>
          <span className="mt-1 block text-sm leading-6 text-zinc-600">{step.detail}</span>
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
        <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
          <Languages className="ml-2 h-4 w-4 text-emerald-700" />
          <button onClick={() => chooseLanguage("en")} className={"rounded-full px-3 py-1.5 text-sm font-semibold " + (lang === "en" ? "bg-emerald-700 text-white" : "text-zinc-600")}>English</button>
          <button onClick={() => chooseLanguage("sw")} className={"rounded-full px-3 py-1.5 text-sm font-semibold " + (lang === "sw" ? "bg-emerald-700 text-white" : "text-zinc-600")}>Kiswahili</button>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{t.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{t.title}</h1>
          <p className="mt-2 max-w-2xl text-zinc-600">{t.intro}</p>
        </div>
        {completed === steps.length && <Link href="/farm" className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">{t.back}</Link>}
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
            {/* Step 1: farm details */}
            {stepCard(0, (
              <form onSubmit={saveFarmDetails} className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-zinc-700 sm:col-span-2">{t.farmName}<input required value={detailsForm.name} onChange={(event) => setDetailsForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} /></label>
                <label className="text-sm font-medium text-zinc-700">{t.location}<input required value={detailsForm.location} onChange={(event) => setDetailsForm((current) => ({ ...current, location: event.target.value }))} placeholder={t.locationPlaceholder} className={inputClass} /></label>
                <label className="text-sm font-medium text-zinc-700">{t.acreage}<input required type="number" min="0.01" step="0.01" value={detailsForm.sizeAcres} onChange={(event) => setDetailsForm((current) => ({ ...current, sizeAcres: event.target.value }))} placeholder={t.acreagePlaceholder} className={inputClass} /></label>
                <div className="sm:col-span-2">
                  <button type="submit" disabled={savingDetails || !detailsForm.name.trim() || !detailsForm.location.trim() || Number(detailsForm.sizeAcres) <= 0} className={"w-full sm:w-auto " + primaryButton}>{savingDetails ? t.savingDetails : t.saveDetails}</button>
                  {detailsMessage && <p className="mt-3 text-sm font-medium text-emerald-700">{detailsMessage}</p>}
                </div>
              </form>
            ))}

            {/* Step 2: crops, added right here */}
            {stepCard(1, (
              <div>
                {crops.length > 0 && (
                  <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{t.cropsSoFar}</p>
                    <ul className="mt-2 space-y-1 text-sm text-zinc-800">
                      {crops.map((crop) => (
                        <li key={crop.id} className="flex flex-wrap items-center gap-x-3">
                          <span className="font-medium">{cropNameById.get(crop.id)}</span>
                          {crop.planted_on && <span className="text-zinc-500">{t.plantedOn.toLowerCase()} {crop.planted_on}</span>}
                          {crop.expected_sale_price_per_kg != null && <span className="text-zinc-500">{crop.expected_sale_price_per_kg}/{t.kg}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <form onSubmit={addCrop} className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-zinc-700">{t.cropName}<input required value={cropForm.name} onChange={(event) => setCropForm((current) => ({ ...current, name: event.target.value }))} placeholder={t.cropPlaceholder} className={inputClass} /></label>
                  <label className="text-sm font-medium text-zinc-700">{t.variety} <span className="font-normal text-zinc-400">({t.optional})</span><input value={cropForm.variety} onChange={(event) => setCropForm((current) => ({ ...current, variety: event.target.value }))} placeholder={t.varietyPlaceholder} className={inputClass} /></label>
                  <label className="text-sm font-medium text-zinc-700">{t.plantedOn} <span className="font-normal text-zinc-400">({t.optional})</span><input type="date" value={cropForm.plantedOn} onChange={(event) => setCropForm((current) => ({ ...current, plantedOn: event.target.value }))} className={inputClass} /></label>
                  <label className="text-sm font-medium text-zinc-700">{t.expectedHarvestStart} <span className="font-normal text-zinc-400">({t.optional})</span><input type="date" value={cropForm.expectedHarvestStart} onChange={(event) => setCropForm((current) => ({ ...current, expectedHarvestStart: event.target.value }))} className={inputClass} /></label>
                  <label className="text-sm font-medium text-zinc-700">{t.pricePerKg} <span className="font-normal text-zinc-400">({t.optional})</span><input type="number" min="0" step="0.01" value={cropForm.pricePerKg} onChange={(event) => setCropForm((current) => ({ ...current, pricePerKg: event.target.value }))} className={inputClass} /></label>
                  <label className="text-sm font-medium text-zinc-700">{t.yieldKg} <span className="font-normal text-zinc-400">({t.optional})</span><input type="number" min="0" step="0.1" value={cropForm.yieldKg} onChange={(event) => setCropForm((current) => ({ ...current, yieldKg: event.target.value }))} className={inputClass} /></label>
                  <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                    <button type="submit" disabled={savingCrop || !cropForm.name.trim()} className={primaryButton}>{savingCrop ? t.addingCrop : t.addCrop}</button>
                    {hasCrop && <button type="button" onClick={() => goToStep(2)} className={secondaryButton}>{t.continueHarvest}<ChevronRight className="ml-1 inline h-4 w-4" /></button>}
                  </div>
                  {cropMessage && <p className="text-sm font-medium text-emerald-700 sm:col-span-2">{cropMessage}</p>}
                </form>
              </div>
            ))}

            {/* Step 3: harvest estimate, also inline */}
            {stepCard(2, (
              <div>
                {harvests.filter((row) => expectedTotal(row) > 0).length > 0 && (
                  <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{t.estimatesSoFar}</p>
                    <ul className="mt-2 space-y-1 text-sm text-zinc-800">
                      {harvests.filter((row) => expectedTotal(row) > 0).map((row) => (
                        <li key={row.id}><span className="font-medium">{(row.crop_id && cropNameById.get(row.crop_id)) || row.bed_name}</span> <span className="text-zinc-500">{expectedTotal(row)} {t.kg}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {!hasCrop ? (
                  <button type="button" onClick={() => goToStep(1)} className={secondaryButton}>{steps[1].action}<ChevronRight className="ml-1 inline h-4 w-4" /></button>
                ) : (
                  <form onSubmit={saveHarvestEstimate} className="grid gap-4 sm:grid-cols-3">
                    <label className="text-sm font-medium text-zinc-700">{t.chooseCrop}<select value={harvestForm.cropId} onChange={(event) => setHarvestForm((current) => ({ ...current, cropId: event.target.value }))} className={inputClass}>{crops.map((crop) => <option key={crop.id} value={crop.id}>{cropNameById.get(crop.id)}</option>)}</select></label>
                    <label className="text-sm font-medium text-zinc-700">{t.harvestMonth}<select value={harvestForm.month} onChange={(event) => setHarvestForm((current) => ({ ...current, month: event.target.value as HarvestMonthKey }))} className={inputClass}>{monthOptions.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
                    <label className="text-sm font-medium text-zinc-700">{t.expectedKg}<input required type="number" min="0.1" step="0.1" value={harvestForm.kg} onChange={(event) => setHarvestForm((current) => ({ ...current, kg: event.target.value }))} className={inputClass} /></label>
                    <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
                      <button type="submit" disabled={savingHarvest || !harvestForm.cropId || Number(harvestForm.kg) <= 0} className={primaryButton}>{savingHarvest ? t.savingHarvest : t.saveHarvest}</button>
                      {hasHarvest && <button type="button" onClick={() => goToStep(3)} className={secondaryButton}>{t.continueShop}<ChevronRight className="ml-1 inline h-4 w-4" /></button>}
                    </div>
                    {harvestMessage && <p className="text-sm font-medium text-emerald-700 sm:col-span-3">{harvestMessage}</p>}
                  </form>
                )}
              </div>
            ))}

            {/* Steps 4 and 5 live on the settings page (photo upload, publish toggle). */}
            {[3, 4].map((index) => stepCard(index, (
              <Link href={`${steps[index].href}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">{steps[index].done ? t.review : steps[index].action}<ChevronRight className="h-4 w-4" /></Link>
            )))}
          </div>

          {completed === steps.length ? (
            <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><div className="flex items-center gap-2 font-semibold text-emerald-950"><Check className="h-5 w-5" />{t.live}</div>{listing.slug && <Link href={`/${listing.slug}`} target="_blank" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">{t.open} <ExternalLink className="h-4 w-4" /></Link>}</section>
          ) : next && nextIndex !== expanded ? (
            <button type="button" onClick={() => goToStep(nextIndex)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3.5 text-sm font-semibold text-white hover:bg-emerald-800">{t.continue}: {next.title}<ChevronRight className="h-4 w-4" /></button>
          ) : null}

          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-zinc-500"><Circle className="mt-1 h-2 w-2 shrink-0 fill-current" />{t.privacy}</p>
          <p className="mt-6 text-center text-sm"><Link href="/farm" className="text-zinc-500 hover:text-zinc-900 hover:underline">{t.skip}</Link></p>
        </>
      )}
    </main>
  );
}
