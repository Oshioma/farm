"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Circle, ExternalLink, Sprout } from "lucide-react";
import { getCrops, getFarms, getHarvestEta } from "@/lib/farm";
import type { Crop, Farm, HarvestEtaEntry } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";

type Listing = { listed: boolean; slug: string | null; heroUrl: string | null; available: boolean };

export default function FarmerOnboardingPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [crops, setCrops] = useState<Crop[]>([]);
  const [harvests, setHarvests] = useState<HarvestEtaEntry[]>([]);
  const [listing, setListing] = useState<Listing>({ listed: false, slug: null, heroUrl: null, available: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useFarmSelection({ farms, activeFarmId, setActiveFarmId });

  useEffect(() => {
    getFarms()
      .then(setFarms)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load farms"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getCrops(activeFarmId),
      getHarvestEta(activeFarmId, [new Date().getFullYear(), new Date().getFullYear() + 1]),
      fetch(`/api/farm/market-listing?farm_id=${encodeURIComponent(activeFarmId)}`).then((res) => res.json()),
    ])
      .then(([cropRows, harvestRows, shop]) => {
        if (cancelled) return;
        setCrops(cropRows);
        setHarvests(harvestRows);
        setListing({
          listed: !!shop.listed,
          slug: shop.slug ?? null,
          heroUrl: shop.heroUrl ?? null,
          available: shop.available !== false,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not check setup");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeFarmId]);

  const farm = farms.find((item) => item.id === activeFarmId) ?? null;
  const hasCrop = crops.length > 0;
  const hasHarvest = harvests.some((row) => {
    const values = Object.entries(row).filter(([key]) => /_expected$/.test(key));
    return values.some(([, value]) => Number(value) > 0);
  });
  const hasShopDetails = !!listing.heroUrl && crops.some((crop) => crop.expected_sale_price_per_kg && (crop.produce_image_url || crop.image_url));

  const steps = useMemo(() => [
    {
      title: "Describe your farm",
      detail: "Add a location and farm size so buyers know where their food is grown.",
      done: !!farm?.location && !!farm?.size_acres,
      href: "/farm#farm-details",
      action: "Add farm details",
    },
    {
      title: "Add your first crop",
      detail: "Record what is in the ground, the variety, planting date and expected price.",
      done: hasCrop,
      href: "/farm#crops",
      action: "Add a crop",
    },
    {
      title: "Estimate the harvest",
      detail: "Say which month it should be ready and roughly how many kilograms you expect.",
      done: hasHarvest,
      href: "/farm/harvest-eta",
      action: "Add expected harvest",
    },
    {
      title: "Prepare the shop",
      detail: "Add a farm photo, produce photo and price before publishing.",
      done: hasShopDetails,
      href: "/farm/settings#public-shop",
      action: "Prepare shop",
    },
    {
      title: "Publish when ready",
      detail: "Turn on the public listing only after the crop and harvest details look right.",
      done: listing.listed,
      href: "/farm/settings#public-shop",
      action: "Review and publish",
    },
  ], [farm, hasCrop, hasHarvest, hasShopDetails, listing.listed]);

  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);
  const next = steps.find((step) => !step.done);

  if (loading && farms.length === 0) {
    return <main className="mx-auto max-w-3xl px-4 py-12 text-sm text-zinc-500">Checking your farm setup…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Farmer setup</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Get ready to take real orders</h1>
          <p className="mt-2 max-w-2xl text-zinc-600">Work through this once. You can return any time and Shamba will recognise what is already complete.</p>
        </div>
        <Link href="/farm" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">Back to farm</Link>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {farms.length > 1 && (
        <label className="mb-6 block text-sm font-medium text-zinc-700">
          Farm
          <select value={activeFarmId} onChange={(event) => setActiveFarmId(event.target.value)} className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-3">
            {farms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      )}

      {!farm ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <Sprout className="mx-auto h-8 w-8 text-emerald-700" />
          <h2 className="mt-3 text-xl font-semibold">Create your farm first</h2>
          <p className="mt-2 text-sm text-zinc-600">Once it exists, this guide will take you from the first crop to a public shop.</p>
          <Link href="/farm" className="mt-5 inline-flex rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Create a farm</Link>
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-2xl bg-emerald-950 p-6 text-white">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-emerald-200">{farm.name}</p>
                <p className="mt-1 text-2xl font-semibold">{completed} of {steps.length} complete</p>
              </div>
              <span className="text-3xl font-semibold">{progress}%</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </section>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <Link key={step.title} href={step.href} className="group flex gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
                  {step.done ? <Check className="h-4 w-4 text-emerald-700" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold text-zinc-950">
                    {step.title}
                    {step.done && <span className="text-xs font-medium text-emerald-700">Done</span>}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-zinc-600">{step.detail}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                    {step.done ? "Review" : step.action}<ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            ))}
          </div>

          {completed === steps.length ? (
            <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-center gap-2 font-semibold text-emerald-950"><Check className="h-5 w-5" />Your shop is live</div>
              {listing.slug && <Link href={`/${listing.slug}`} target="_blank" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">Open public shop <ExternalLink className="h-4 w-4" /></Link>}
            </section>
          ) : next ? (
            <Link href={next.href} className="mt-6 flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3.5 text-sm font-semibold text-white hover:bg-emerald-800">
              Continue: {next.title}<ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}

          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-zinc-500"><Circle className="mt-1 h-2 w-2 shrink-0 fill-current" />Publishing stays off until you choose it. Buyers cannot find an unfinished shop.</p>
        </>
      )}
    </main>
  );
}
