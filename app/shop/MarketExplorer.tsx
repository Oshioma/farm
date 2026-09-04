"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LocateFixed, Search, SlidersHorizontal } from "lucide-react";
import type { MarketFarm } from "@/lib/shop";

type Sort = "earliest" | "nearest" | "farm";
type Practice = "all" | "organic" | "regenerative";
type Position = { latitude: number; longitude: number };

const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const MONTH_LABELS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function verified(farm: MarketFarm) {
  return !!farm.certificationVerifiedAt && (!farm.certificationExpiresOn || farm.certificationExpiresOn >= new Date().toISOString().slice(0, 10));
}
function earliest(farm: MarketFarm) {
  const values = farm.produce.flatMap((crop) => crop.months.map((m) => m.calendarYear * 12 + MONTHS.indexOf(m.key)));
  return values.length ? Math.min(...values) : Number.MAX_SAFE_INTEGER;
}
function distance(farm: MarketFarm, position: Position | null) {
  if (!position || farm.latitude == null || farm.longitude == null) return Number.MAX_SAFE_INTEGER;
  const rad = Math.PI / 180;
  const dLat = (farm.latitude - position.latitude) * rad;
  const dLon = (farm.longitude - position.longitude) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(position.latitude * rad) * Math.cos(farm.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function practiceLabel(farm: MarketFarm) {
  if (verified(farm)) return "Verified organic";
  if (farm.growingPractice === "organic_practices") return "Organic practices";
  if (farm.growingPractice === "regenerative") return "Regenerative";
  return null;
}

export default function MarketExplorer({ farms }: { farms: MarketFarm[] }) {
  const [query, setQuery] = useState("");
  const [practice, setPractice] = useState<Practice>("all");
  const [month, setMonth] = useState("all");
  const [availableNow, setAvailableNow] = useState(false);
  const [sort, setSort] = useState<Sort>("earliest");
  const [position, setPosition] = useState<Position | null>(null);
  const [locationError, setLocationError] = useState("");

  const monthOptions = useMemo(() => {
    const seen = new Set<string>();
    farms.forEach((farm) => farm.produce.forEach((crop) => crop.months.forEach((m) => seen.add(`${m.calendarYear}-${m.key}`))));
    return [...seen].sort((a,b) => {
      const [ay,am]=a.split("-"); const [by,bm]=b.split("-");
      return Number(ay)*12+MONTHS.indexOf(am) - (Number(by)*12+MONTHS.indexOf(bm));
    });
  }, [farms]);

  const results = useMemo(() => {
    const now = new Date();
    const currentKey = MONTHS[now.getMonth()];
    const q = query.trim().toLowerCase();
    return farms.filter((farm) => {
      const searchable = [farm.name, farm.location, ...farm.produce.flatMap((p) => [p.name, p.variety])].filter(Boolean).join(" ").toLowerCase();
      if (q && !searchable.includes(q)) return false;
      if (practice === "organic" && farm.growingPractice !== "organic_practices" && !verified(farm)) return false;
      if (practice === "regenerative" && farm.growingPractice !== "regenerative") return false;
      if (month !== "all" && !farm.produce.some((p) => p.months.some((m) => `${m.calendarYear}-${m.key}` === month))) return false;
      if (availableNow && !farm.produce.some((p) => p.months.some((m) => m.calendarYear === now.getFullYear() && m.key === currentKey && (m.availableKg ?? 0) > 0))) return false;
      return true;
    }).sort((a,b) => sort === "nearest" ? distance(a,position)-distance(b,position) : sort === "farm" ? a.name.localeCompare(b.name) : earliest(a)-earliest(b));
  }, [farms, query, practice, month, availableNow, sort, position]);

  function useLocation() {
    setLocationError("");
    if (!navigator.geolocation) { setLocationError("Location is not available on this device."); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setPosition({ latitude: coords.latitude, longitude: coords.longitude }); setSort("nearest"); },
      () => setLocationError("Allow location access to sort by nearest farm."),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  return (
    <div>
      <section className="mb-7 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-stone-400" />
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search crops, farms or locations" className="min-h-12 w-full rounded-2xl border border-stone-300 pl-12 pr-4 text-base outline-none focus:border-emerald-600" />
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Practice<select value={practice} onChange={(e)=>setPractice(e.target.value as Practice)} className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm normal-case"><option value="all">All practices</option><option value="organic">Organic practices</option><option value="regenerative">Regenerative</option></select></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Harvest month<select value={month} onChange={(e)=>setMonth(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm normal-case"><option value="all">Any month</option>{monthOptions.map((value)=>{const [year,key]=value.split("-");return <option key={value} value={value}>{MONTH_LABELS[MONTHS.indexOf(key)]} {year}</option>;})}</select></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Sort<select value={sort} onChange={(e)=>setSort(e.target.value as Sort)} className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm normal-case"><option value="earliest">Earliest harvest</option><option value="farm">Farm name</option><option value="nearest" disabled={!position}>Nearest location</option></select></label>
          <button onClick={useLocation} className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800"><LocateFixed className="h-4 w-4" />{position ? "Location added" : "Sort by nearest"}</button>
        </div>
        <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-full bg-stone-100 px-4 text-sm font-semibold text-stone-700"><input type="checkbox" checked={availableNow} onChange={(e)=>setAvailableNow(e.target.checked)} className="h-4 w-4 accent-emerald-700" />Available now</label>
        {locationError && <p className="mt-3 text-sm text-amber-700">{locationError}</p>}
      </section>

      <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm text-stone-500">{results.length} farm{results.length===1?"":"s"} found</p><SlidersHorizontal className="h-4 w-4 text-stone-400" /></div>
      {results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-10 text-center"><Search className="mx-auto h-8 w-8 text-emerald-700" /><h2 className="mt-3 text-xl font-semibold">No matching produce yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">Try another crop, location or harvest month. Farms update their expected harvests as the season changes.</p><button onClick={()=>{setQuery("");setPractice("all");setMonth("all");setAvailableNow(false);}} className="mt-5 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Clear filters</button></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">{results.map((farm)=>{
          const km=distance(farm,position);
          return <article key={farm.slug} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            {farm.heroUrl && <img src={farm.heroUrl} alt="" className="h-44 w-full object-cover" />}
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-3xl">{farm.name}</h2>{verified(farm)&&<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Verified organic</span>}</div>
              <p className="mt-1 text-sm text-stone-500">{farm.location||"Location not supplied"}{Number.isFinite(km)&&` · ${km.toFixed(km<10?1:0)} km away`}</p>
              {practiceLabel(farm)&&!verified(farm)&&<span className="mt-3 inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{practiceLabel(farm)}</span>}
              <div className="mt-4 flex flex-wrap gap-2">{farm.produce.slice(0,5).map((p)=><span key={p.cropId} className="rounded-full border border-stone-200 px-3 py-1 text-sm">{p.name}{p.variety?` · ${p.variety}`:""}</span>)}</div>
              <p className="mt-4 text-sm text-stone-600">{farm.monthLabels.slice(0,3).join(" · ")}</p>
              <Link href={`/${farm.slug}`} className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-bold text-white">View produce</Link>
            </div>
          </article>;
        })}</div>
      )}
    </div>
  );
}
