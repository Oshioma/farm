"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Circle, ExternalLink, Languages, Sprout } from "lucide-react";
import { getCrops, getFarms, getHarvestEta } from "@/lib/farm";
import type { Crop, Farm, HarvestEtaEntry } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { supabase } from "@/lib/supabase";

type Lang = "en" | "sw";
type Listing = { listed: boolean; slug: string | null; heroUrl: string | null; available: boolean };

const copy = {
  en: {
    eyebrow: "Farmer setup", title: "Get ready to take real orders",
    intro: "Work through this once. You can return any time and Shamba will recognise what is already complete.",
    back: "Enter farm", farm: "Farm", checking: "Checking your farm setup…",
    createTitle: "Create your farm first", createBody: "Once it exists, this guide will take you from the first crop to a public shop.", create: "Create a farm",
    complete: "complete", done: "Done", review: "Review", continue: "Continue",
    farmName: "Farm name", location: "Location", acreage: "Farm size (acres)", saveDetails: "Save and continue", savingDetails: "Saving…",
    detailsSaved: "Farm details saved. Continue to your first crop.", locationPlaceholder: "Village, district or region", acreagePlaceholder: "e.g. 2.5",
    live: "Your shop is live", open: "Open public shop",
    privacy: "Publishing stays off until you choose it. Buyers cannot find an unfinished shop.",
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
    createTitle: "Anza kwa kuunda shamba lako", createBody: "Likishaundwa, mwongozo huu utakusaidia kutoka zao la kwanza hadi duka la umma.", create: "Unda shamba",
    complete: "zimekamilika", done: "Imekamilika", review: "Kagua", continue: "Endelea",
    farmName: "Jina la shamba", location: "Eneo", acreage: "Ukubwa wa shamba (ekari)", saveDetails: "Hifadhi na uendelee", savingDetails: "Inahifadhi…",
    detailsSaved: "Taarifa za shamba zimehifadhiwa. Endelea kuongeza zao lako la kwanza.", locationPlaceholder: "Kijiji, wilaya au mkoa", acreagePlaceholder: "mf. 2.5",
    live: "Duka lako sasa liko hewani", open: "Fungua duka la umma",
    privacy: "Duka halitawekwa hadharani mpaka uchague kufanya hivyo. Wanunuzi hawawezi kuona duka ambalo halijakamilika.",
    steps: [
      ["Elezea shamba lako", "Weka eneo na ukubwa wa shamba ili wanunuzi wajue chakula chao kinalimwa wapi.", "Weka taarifa za shamba"],
      ["Ongeza zao lako la kwanza", "Andika zao lililopandwa, aina yake, tarehe ya kupanda na bei inayotarajiwa.", "Ongeza zao"],
      ["Kadiria mavuno", "Chagua mwezi wa kuvuna na kadirio la kilo unazotarajia kupata.", "Weka mavuno yanayotarajiwa"],
      ["Andaa duka", "Weka picha ya shamba, picha ya mazao na bei kabla ya kuchapisha.", "Andaa duka"],
      ["Chapisha ukiwa tayari", "Weka duka hadharani baada ya kukagua mazao na makadirio ya mavuno.", "Kagua na uchapishe"],
    ],
  },
} as const;

export default function FarmerOnboardingPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [crops, setCrops] = useState<Crop[]>([]);
  const [harvests, setHarvests] = useState<HarvestEtaEntry[]>([]);
  const [listing, setListing] = useState<Listing>({ listed: false, slug: null, heroUrl: null, available: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailsForm, setDetailsForm] = useState({ name: "", location: "", sizeAcres: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState("");
  useFarmSelection({ farms, activeFarmId, setActiveFarmId });

  useEffect(() => {
    const saved = window.localStorage.getItem("shamba_onboarding_language");
    const preferred: Lang = saved === "sw" || (!saved && navigator.language.toLowerCase().startsWith("sw")) ? "sw" : "en";
    setLang(preferred);
    getFarms().then(setFarms).catch((err) => setError(err instanceof Error ? err.message : "Could not load farms")).finally(() => setLoading(false));
  }, []);

  function chooseLanguage(value: Lang) {
    setLang(value);
    window.localStorage.setItem("shamba_onboarding_language", value);
  }

  useEffect(() => {
    if (!activeFarmId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getCrops(activeFarmId),
      getHarvestEta(activeFarmId, [new Date().getFullYear(), new Date().getFullYear() + 1]),
      fetch(`/api/farm/market-listing?farm_id=${encodeURIComponent(activeFarmId)}`).then((res) => res.json()),
    ]).then(([cropRows, harvestRows, shop]) => {
      if (cancelled) return;
      setCrops(cropRows);
      setHarvests(harvestRows);
      setListing({ listed: !!shop.listed, slug: shop.slug ?? null, heroUrl: shop.heroUrl ?? null, available: shop.available !== false });
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Could not check setup");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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
  }, [farm?.id]);

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
    }
    setSavingDetails(false);
  }

  const hasCrop = crops.length > 0;
  const hasHarvest = harvests.some((row) => Object.entries(row).filter(([key]) => /_expected$/.test(key)).some(([, value]) => Number(value) > 0));
  const hasShopDetails = !!listing.heroUrl && crops.some((crop) => crop.expected_sale_price_per_kg && (crop.produce_image_url || crop.image_url));
  const hrefs = ["#farm-details", "/farm?onboarding=1#crops", "/farm/harvest-eta?onboarding=1", "/farm/settings?onboarding=1#public-shop", "/farm/settings?onboarding=1#public-shop"];
  const done = [!!farm?.location && !!farm?.size_acres, hasCrop, hasHarvest, hasShopDetails, listing.listed];

  const steps = useMemo(() => t.steps.map((step, index) => ({
    title: step[0], detail: step[1], action: step[2], href: hrefs[index], done: done[index],
  })), [t, farm, hasCrop, hasHarvest, hasShopDetails, listing.listed]);

  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);
  const next = steps.find((step) => !step.done);

  if (loading && farms.length === 0) return <main className="mx-auto max-w-3xl px-4 py-12 text-sm text-zinc-500">{t.checking}</main>;

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
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <Sprout className="mx-auto h-8 w-8 text-emerald-700" /><h2 className="mt-3 text-xl font-semibold">{t.createTitle}</h2><p className="mt-2 text-sm text-zinc-600">{t.createBody}</p>
          <Link href="/farm" className="mt-5 inline-flex rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">{t.create}</Link>
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-2xl bg-emerald-950 p-6 text-white">
            <div className="flex items-end justify-between gap-4"><div><p className="text-sm text-emerald-200">{farm.name}</p><p className="mt-1 text-2xl font-semibold">{completed} / {steps.length} {t.complete}</p></div><span className="text-3xl font-semibold">{progress}%</span></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>
          </section>

          <div className="space-y-3">
            <section id="farm-details" className="scroll-mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">{done[0] ? <Check className="h-4 w-4 text-emerald-700" /> : 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold text-zinc-950">{steps[0].title}{done[0] && <span className="text-xs font-medium text-emerald-700">{t.done}</span>}</div>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">{steps[0].detail}</p>
                  <form onSubmit={saveFarmDetails} className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-zinc-700 sm:col-span-2">{t.farmName}<input required value={detailsForm.name} onChange={(event) => setDetailsForm((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 block w-full rounded-xl border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                    <label className="text-sm font-medium text-zinc-700">{t.location}<input required value={detailsForm.location} onChange={(event) => setDetailsForm((current) => ({ ...current, location: event.target.value }))} placeholder={t.locationPlaceholder} className="mt-1.5 block w-full rounded-xl border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                    <label className="text-sm font-medium text-zinc-700">{t.acreage}<input required type="number" min="0.01" step="0.01" value={detailsForm.sizeAcres} onChange={(event) => setDetailsForm((current) => ({ ...current, sizeAcres: event.target.value }))} placeholder={t.acreagePlaceholder} className="mt-1.5 block w-full rounded-xl border border-zinc-300 px-3 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                    <div className="sm:col-span-2"><button disabled={savingDetails || !detailsForm.name.trim() || !detailsForm.location.trim() || Number(detailsForm.sizeAcres) <= 0} className="w-full rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{savingDetails ? t.savingDetails : t.saveDetails}</button>{detailsMessage && <p className="mt-3 text-sm font-medium text-emerald-700">{detailsMessage}</p>}</div>
                  </form>
                </div>
              </div>
            </section>
            {steps.slice(1).map((step, offset) => {
              const index = offset + 1;
              return (
            <Link key={step.title} href={step.href} className="group flex gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">{step.done ? <Check className="h-4 w-4 text-emerald-700" /> : index + 1}</span>
              <span className="min-w-0 flex-1"><span className="flex items-center gap-2 font-semibold text-zinc-950">{step.title}{step.done && <span className="text-xs font-medium text-emerald-700">{t.done}</span>}</span><span className="mt-1 block text-sm leading-6 text-zinc-600">{step.detail}</span><span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">{step.done ? t.review : step.action}<ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span></span>
            </Link>
              );
            })}
          </div>

          {completed === steps.length ? (
            <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><div className="flex items-center gap-2 font-semibold text-emerald-950"><Check className="h-5 w-5" />{t.live}</div>{listing.slug && <Link href={`/${listing.slug}`} target="_blank" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">{t.open} <ExternalLink className="h-4 w-4" /></Link>}</section>
          ) : next ? <Link href={next.href} className="mt-6 flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3.5 text-sm font-semibold text-white hover:bg-emerald-800">{t.continue}: {next.title}<ChevronRight className="h-4 w-4" /></Link> : null}

          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-zinc-500"><Circle className="mt-1 h-2 w-2 shrink-0 fill-current" />{t.privacy}</p>
        </>
      )}
    </main>
  );
}
