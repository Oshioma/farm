"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, ExternalLink, KeyRound } from "lucide-react";
import type { InviteState } from "@/lib/invites";
import { usePageLanguage } from "@/hooks/usePageLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ShareWhatsAppButton } from "@/components/ShareWhatsAppButton";

/* One question per screen, big controls, no account. Copy lives here rather
   than in the shared dictionary because the page has to work before the
   farmer has any language preference saved; the invite's language is used
   until they touch the toggle. */
const copy = {
  en: {
    brand: "Shamba Online",
    hello: (name: string) => `Hello ${name}`,
    farmQ: "What is the name of your farm?",
    farmPlaceholder: "e.g. Mama Amina's farm",
    locationQ: (farm: string) => `Where is ${farm}?`,
    locationPlaceholder: "Village, district or region",
    cropQ: "What are you growing?",
    cropIntro: "Add one crop now. You can add more afterwards.",
    cropName: "Crop", cropPlaceholder: "e.g. Tomatoes",
    variety: "Variety", varietyPlaceholder: "e.g. Roma",
    harvestDate: "When will it be ready?",
    expectedKg: "How many kilograms do you expect?",
    pricePerKg: "Price per kg", optional: "optional",
    cropsSoFar: "Your crops",
    addCrop: "Add crop and open my shop",
    openShop: "Open my shop", opening: "Opening…",
    next: "Next", saving: "Saving…",
    need: "Fill in the fields above to continue.",
    liveTitle: "Your shop is live",
    liveBody: (farm: string) => `Buyers can now find ${farm} and reserve your produce. Share the link below.`,
    viewShop: "See my shop",
    shareShop: "Share on WhatsApp", sharing: "Opening…", copyLink: "Copy link", copied: "Copied",
    shareText: (farm: string, link: string) => `${farm} is now on Shamba Online. Reserve fresh produce here: ${link}`,
    enterFarm: "Add photos, prices and delivery details",
    entering: "Opening your farm…",
    step: (n: number) => `Step ${n} of 3`,
    error: "Something went wrong. Please try again.",
    pinQ: "Choose a 4-number PIN",
    pinHint: "You will sign in with your phone number and this PIN next time. Keep it secret.",
    pinAgain: "Type the PIN again",
    pinMismatch: "The two PINs are different.",
    pinSet: "Set a PIN to sign in",
    pinChange: "Change my PIN",
    pinSave: "Save PIN",
    pinSaved: "PIN saved.",
    pinMissing: "You have no PIN yet. Choose one now so you can sign in later with your phone number.",
    nextTime: "Next time, sign in with your phone number and PIN:",
    signInPin: "Sign in with my number",
    expiredBody: "This link no longer signs you in. Use your phone number and PIN instead.",
  },
  sw: {
    brand: "Shamba Online",
    hello: (name: string) => `Habari ${name}`,
    farmQ: "Shamba lako linaitwa nani?",
    farmPlaceholder: "mf. Shamba la Mama Amina",
    locationQ: (farm: string) => `${farm} liko wapi?`,
    locationPlaceholder: "Kijiji, wilaya au mkoa",
    cropQ: "Unalima nini?",
    cropIntro: "Ongeza zao moja sasa. Unaweza kuongeza mengine baadaye.",
    cropName: "Zao", cropPlaceholder: "mf. Nyanya",
    variety: "Aina", varietyPlaceholder: "mf. Roma",
    harvestDate: "Litakuwa tayari lini?",
    expectedKg: "Unatarajia kilo ngapi?",
    pricePerKg: "Bei kwa kilo", optional: "hiari",
    cropsSoFar: "Mazao yako",
    addCrop: "Ongeza zao na ufungue duka",
    openShop: "Fungua duka langu", opening: "Inafungua…",
    next: "Endelea", saving: "Inahifadhi…",
    need: "Jaza sehemu zilizo hapo juu ili kuendelea.",
    liveTitle: "Duka lako liko hewani",
    liveBody: (farm: string) => `Wanunuzi sasa wanaweza kuona ${farm} na kuagiza mazao yako. Shiriki kiungo hapa chini.`,
    viewShop: "Ona duka langu",
    shareShop: "Shiriki kwenye WhatsApp", sharing: "Inafungua…", copyLink: "Nakili kiungo", copied: "Imenakiliwa",
    shareText: (farm: string, link: string) => `${farm} sasa lipo Shamba Online. Agiza mazao mapya hapa: ${link}`,
    enterFarm: "Weka picha, bei na maelezo ya usafirishaji",
    entering: "Inafungua shamba lako…",
    step: (n: number) => `Hatua ${n} kati ya 3`,
    error: "Kuna hitilafu imetokea. Tafadhali jaribu tena.",
    pinQ: "Chagua PIN ya tarakimu 4",
    pinHint: "Utaingia kwa namba yako ya simu na PIN hii wakati ujao. Usimwambie mtu.",
    pinAgain: "Andika PIN tena",
    pinMismatch: "PIN mbili hazilingani.",
    pinSet: "Weka PIN ya kuingia",
    pinChange: "Badilisha PIN yangu",
    pinSave: "Hifadhi PIN",
    pinSaved: "PIN imehifadhiwa.",
    pinMissing: "Bado huna PIN. Chagua moja sasa ili uweze kuingia baadaye kwa namba yako ya simu.",
    nextTime: "Wakati ujao, ingia kwa namba yako ya simu na PIN:",
    signInPin: "Ingia kwa namba yangu",
    expiredBody: "Kiungo hiki hakikuingizi tena. Tumia namba yako ya simu na PIN.",
  },
};

const input = "mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-4 text-lg outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const primary = "inline-flex items-center justify-center gap-1 rounded-full bg-emerald-700 px-6 py-4 text-base font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-1 rounded-full border border-emerald-700 px-6 py-4 text-base font-semibold text-emerald-800 hover:bg-emerald-50";

const blankCrop = { name: "", variety: "", harvestDate: "", expectedKg: "", pricePerKg: "" };

const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 4);

/** A PIN typed twice. Big numeric boxes, hidden like a mobile-money PIN. */
function PinFields({ t, pin, again, setPin, setAgain }: {
  t: (typeof copy)["en"];
  pin: string;
  again: string;
  setPin: (value: string) => void;
  setAgain: (value: string) => void;
}) {
  const pinInput = input + " tracking-[0.5em]";
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-700">
        {t.pinQ}
        <input required type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="new-password" value={pin} onChange={(event) => setPin(onlyDigits(event.target.value))} placeholder="••••" className={pinInput} />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        {t.pinAgain}
        <input required type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="new-password" value={again} onChange={(event) => setAgain(onlyDigits(event.target.value))} placeholder="••••" className={pinInput} />
      </label>
      <p className="text-xs text-zinc-500">{t.pinHint}</p>
      {pin.length === 4 && again.length === 4 && pin !== again && <p className="text-xs font-medium text-red-700">{t.pinMismatch}</p>}
    </div>
  );
}

export function StartWizard({ initial }: { initial: InviteState }) {
  const [state, setState] = useState<InviteState>(initial);
  // The sender chose the language for this farmer: it is the first thing they see, until they touch the toggle.
  const [lang, setLang] = usePageLanguage(initial.lang, { preferSaved: false });
  const [farmName, setFarmName] = useState(initial.farm?.name ?? "");
  const [location, setLocation] = useState(initial.farm?.location ?? "");
  const [crop, setCrop] = useState(blankCrop);
  const [showCropForm, setShowCropForm] = useState(initial.crops.length === 0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [pinAgain, setPinAgain] = useState("");
  const [showPinForm, setShowPinForm] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);

  const t = copy[lang];
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const shopLink = state.farm?.slug ? `${origin}/${state.farm.slug}` : "";

  async function post(action: string, payload: Record<string, unknown> = {}) {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/start/${state.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.error);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function saveFarm(event: React.FormEvent) {
    event.preventDefault();
    const next = await post("farm", state.hasPin ? { name: farmName.trim() } : { name: farmName.trim(), pin });
    if (next) {
      setState(next);
      setPin("");
      setPinAgain("");
    }
  }

  async function saveLocation(event: React.FormEvent) {
    event.preventDefault();
    const next = await post("location", { location: location.trim() });
    if (next) setState(next);
  }

  /* Saving the first crop is the last question: publish the shop and take the
     farmer straight there, signed in so the Add crops and Manage farm buttons
     show. Any later visit to this link lands on the finished screen instead. */
  async function saveCrop(event: React.FormEvent) {
    event.preventDefault();
    const next = await post("crop", { ...crop, name: crop.name.trim(), variety: crop.variety.trim() });
    if (!next) return;
    setState(next);
    setCrop(blankCrop);
    setShowCropForm(false);
    await openShop(next);
  }

  async function openShop(current: InviteState = state) {
    const opened = await post("open");
    if (!opened) return;
    setState(opened);
    const slug = opened.farm?.slug ?? current.farm?.slug;
    if (!slug) return;
    const data = await post("enter", { next: `/${slug}` });
    window.location.href = data?.url ?? `${window.location.origin}/${slug}`;
  }

  async function savePin(event: React.FormEvent) {
    event.preventDefault();
    const next = await post("pin", { pin });
    if (!next) return;
    setState(next);
    setPin("");
    setPinAgain("");
    setShowPinForm(false);
    setPinSaved(true);
  }

  async function enterFarm() {
    const data = await post("enter", { next: "/farm/prepare" });
    if (data?.url) window.location.href = data.url;
  }

  async function viewShop() {
    if (!state.farm) return;
    if (!state.linkActive) {
      window.location.href = shopLink;
      return;
    }
    const data = await post("enter", { next: `/${state.farm.slug}` });
    window.location.href = data?.url ?? shopLink;
  }

  const pinReady = pin.length === 4 && pin === pinAgain;
  const cropReady = !!crop.name.trim() && !!crop.harvestDate && Number(crop.expectedKg) > 0;
  const stepNumber = state.step === "farm" ? 1 : state.step === "location" ? 2 : 3;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{t.brand}</p>
          <LanguageToggle lang={lang} onChange={(value) => { setLang(value); void post("lang", { lang: value }); }} />
        </div>

        {state.step !== "done" && (
          <div className="mb-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(stepNumber / 3) * 100}%` }} /></div>
            <span className="text-xs font-medium text-zinc-500">{t.step(stepNumber)}</span>
          </div>
        )}

        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          {state.step === "farm" && (
            <form onSubmit={saveFarm}>
              <p className="text-sm text-zinc-500">{t.hello(state.farmerName)}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t.farmQ}</h1>
              <input autoFocus required value={farmName} onChange={(event) => setFarmName(event.target.value)} placeholder={t.farmPlaceholder} className={input} />
              {!state.hasPin && (
                <div className="mt-5 border-t border-zinc-100 pt-5">
                  <PinFields t={t} pin={pin} again={pinAgain} setPin={setPin} setAgain={setPinAgain} />
                </div>
              )}
              <button type="submit" disabled={busy === "farm" || !farmName.trim() || (!state.hasPin && !pinReady)} className={"mt-5 w-full " + primary}>{busy === "farm" ? t.saving : t.next}<ChevronRight className="h-5 w-5" /></button>
              {(!farmName.trim() || (!state.hasPin && !pinReady)) && <p className="mt-2 text-xs text-zinc-500">{t.need}</p>}
            </form>
          )}

          {state.step === "location" && state.farm && (
            <form onSubmit={saveLocation}>
              <h1 className="text-2xl font-semibold tracking-tight">{t.locationQ(state.farm.name)}</h1>
              <input autoFocus required value={location} onChange={(event) => setLocation(event.target.value)} placeholder={t.locationPlaceholder} className={input} />
              <button type="submit" disabled={busy === "location" || !location.trim()} className={"mt-5 w-full " + primary}>{busy === "location" ? t.saving : t.next}<ChevronRight className="h-5 w-5" /></button>
              {!location.trim() && <p className="mt-2 text-xs text-zinc-500">{t.need}</p>}
            </form>
          )}

          {state.step === "crop" && state.farm && (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{t.cropQ}</h1>
              {state.crops.length === 0 && <p className="mt-1 text-sm text-zinc-600">{t.cropIntro}</p>}

              {state.crops.length > 0 && (
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{t.cropsSoFar}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {state.crops.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center gap-x-3">
                        <span className="font-medium">{item.variety ? `${item.name} · ${item.variety}` : item.name}</span>
                        {item.harvestDate && <span className="text-zinc-500">{item.harvestDate}</span>}
                        {item.expectedKg != null && <span className="text-zinc-500">{item.expectedKg} kg</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showCropForm ? (
                <form onSubmit={saveCrop} className="mt-4 space-y-4">
                  <label className="block text-sm font-medium text-zinc-700">{t.cropName}<input autoFocus required value={crop.name} onChange={(event) => setCrop((c) => ({ ...c, name: event.target.value }))} placeholder={t.cropPlaceholder} className={input} /></label>
                  <label className="block text-sm font-medium text-zinc-700">{t.variety} <span className="font-normal text-zinc-400">({t.optional})</span><input value={crop.variety} onChange={(event) => setCrop((c) => ({ ...c, variety: event.target.value }))} placeholder={t.varietyPlaceholder} className={input} /></label>
                  <label className="block text-sm font-medium text-zinc-700">{t.harvestDate}<input required type="date" value={crop.harvestDate} onChange={(event) => setCrop((c) => ({ ...c, harvestDate: event.target.value }))} className={input} /></label>
                  <label className="block text-sm font-medium text-zinc-700">{t.expectedKg}<input required type="number" min="0.1" step="0.1" inputMode="decimal" value={crop.expectedKg} onChange={(event) => setCrop((c) => ({ ...c, expectedKg: event.target.value }))} className={input} /></label>
                  <label className="block text-sm font-medium text-zinc-700">{t.pricePerKg} <span className="font-normal text-zinc-400">({t.optional})</span><input type="number" min="0" step="0.01" inputMode="decimal" value={crop.pricePerKg} onChange={(event) => setCrop((c) => ({ ...c, pricePerKg: event.target.value }))} className={input} /></label>
                  <button type="submit" disabled={busy !== null || !cropReady} className={"w-full " + primary}>{busy ? t.opening : t.addCrop}<ChevronRight className="h-5 w-5" /></button>
                  {!cropReady && <p className="text-xs text-zinc-500">{t.need}</p>}
                </form>
              ) : (
                <div className="mt-5 grid gap-3">
                  <button type="button" onClick={() => openShop()} disabled={busy !== null} className={primary}>{busy ? t.opening : t.openShop}<ChevronRight className="h-5 w-5" /></button>
                </div>
              )}
            </div>
          )}

          {state.step === "done" && state.farm && (
            <div>
              <div className="flex items-center gap-2 text-emerald-800"><Check className="h-6 w-6" /><h1 className="text-2xl font-semibold tracking-tight">{t.liveTitle}</h1></div>
              <p className="mt-2 text-sm text-zinc-600">{t.liveBody(state.farm.name)}</p>
              <div className="mt-5 grid gap-3">
                <button type="button" onClick={viewShop} disabled={busy === "enter"} className={primary}>{busy === "enter" ? t.entering : t.viewShop} <ExternalLink className="h-5 w-5" /></button>
                <ShareWhatsAppButton
                  text={t.shareText(state.farm.name, shopLink)}
                  label={t.shareShop}
                  sharingLabel={t.sharing}
                  copyLabel={t.copyLink}
                  copiedLabel={t.copied}
                  className={secondary}
                  copyClassName="inline-flex items-center justify-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                />
                {state.linkActive && (
                  <button type="button" onClick={enterFarm} disabled={busy === "enter"} className="text-sm font-semibold text-emerald-800 hover:underline">{busy === "enter" ? t.entering : t.enterFarm}</button>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-200 bg-stone-50 p-4">
                {state.linkActive ? (
                  <>
                    {!state.hasPin && <p className="mb-3 text-sm font-medium text-amber-800">{t.pinMissing}</p>}
                    {pinSaved && <p className="mb-3 text-sm font-medium text-emerald-800">{t.pinSaved}</p>}
                    {showPinForm || !state.hasPin ? (
                      <form onSubmit={savePin} className="space-y-4">
                        <PinFields t={t} pin={pin} again={pinAgain} setPin={setPin} setAgain={setPinAgain} />
                        <button type="submit" disabled={busy === "pin" || !pinReady} className={"w-full " + primary}>{busy === "pin" ? t.saving : t.pinSave}</button>
                      </form>
                    ) : (
                      <>
                        <p className="text-sm text-zinc-600">{t.nextTime}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <Link href="/ingia" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline"><KeyRound className="h-4 w-4" /> {t.signInPin}</Link>
                          <button type="button" onClick={() => { setShowPinForm(true); setPinSaved(false); }} className="text-sm font-semibold text-zinc-600 hover:text-zinc-900">{t.pinChange}</button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-zinc-600">{t.expiredBody}</p>
                    <Link href="/ingia" className={"mt-3 w-full " + primary}><KeyRound className="h-5 w-5" /> {t.signInPin}</Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
