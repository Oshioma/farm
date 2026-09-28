"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Phone } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { usePageLanguage } from "@/hooks/usePageLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";

/* Public: sign in with a phone number and the 4-digit PIN chosen during
   WhatsApp setup. Farmers with an email and password use /login instead.
   Kiswahili first; ?lang=en (or /signin/phone) opens it in English. */
const copy = {
  en: {
    brand: "Shamba Online",
    title: "Sign in with your number",
    phone: "WhatsApp number",
    pin: "PIN", pinHint: "The 4 numbers you chose when you set up your farm",
    submit: "Sign in", submitting: "Signing in…",
    forgot: "Forgot your PIN? Open the WhatsApp link you were sent and choose a new one. If it has expired, ask Shamba Online for a new link.",
    noAccount: "New here?", signUp: "Sign up with WhatsApp",
    email: "Have an email and password? Sign in here",
    error: "Something went wrong. Please try again.",
  },
  sw: {
    brand: "Shamba Online",
    title: "Ingia kwa namba yako",
    phone: "Namba ya WhatsApp",
    pin: "PIN", pinHint: "Tarakimu 4 ulizochagua ulipoandaa shamba lako",
    submit: "Ingia", submitting: "Inaingia…",
    forgot: "Umesahau PIN? Fungua kiungo cha WhatsApp ulichotumiwa uchague mpya. Kama kimeisha muda, omba kiungo kipya kutoka Shamba Online.",
    noAccount: "Mgeni hapa?", signUp: "Jisajili kwa WhatsApp",
    email: "Una barua pepe na nenosiri? Ingia hapa",
    error: "Kuna hitilafu imetokea. Tafadhali jaribu tena.",
  },
};

const input = "mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-4 text-lg outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const primary = "inline-flex items-center justify-center gap-1 rounded-full bg-emerald-700 px-6 py-4 text-base font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";

type Props = { initialLang: Lang; explicit: boolean; initialPhone: string; next: string };

export function PhoneLogin({ initialLang, explicit, initialPhone, next }: Props) {
  // A language in the link wins; otherwise one already chosen on this device does.
  const [lang, setLang] = usePageLanguage(initialLang, { preferSaved: !explicit });
  const [phone, setPhone] = useState(initialPhone);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const t = copy[lang];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/phone-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin, lang, next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || t.error);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
      setPin("");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 text-zinc-900">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{t.brand}</p>
          <LanguageToggle lang={lang} onChange={setLang} />
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <Phone className="h-8 w-8 text-emerald-600" aria-hidden="true" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t.title}</h1>

          <label className="mt-5 block text-sm font-medium text-zinc-700">
            {t.phone}
            <input autoFocus={!phone} required type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0712 345 678" autoComplete="tel" className={input} />
          </label>

          <label className="mt-4 block text-sm font-medium text-zinc-700">
            {t.pin}
            <input
              autoFocus={!!phone}
              required
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              autoComplete="current-password"
              className={input + " tracking-[0.5em]"}
            />
            <span className="mt-1 block text-xs font-normal text-zinc-500">{t.pinHint}</span>
          </label>

          <button type="submit" disabled={busy || pin.length !== 4 || phone.replace(/\D/g, "").length < 9} className={"mt-6 w-full " + primary}>
            {busy ? t.submitting : t.submit}<ChevronRight className="h-5 w-5" />
          </button>

          <p className="mt-4 text-xs text-zinc-500">{t.forgot}</p>
        </form>

        <div className="mt-5 space-y-2 text-center text-sm text-zinc-600">
          <p>{t.noAccount} <Link href={lang === "en" ? "/jisajili?lang=en" : "/jisajili"} className="font-semibold text-emerald-800 hover:underline">{t.signUp}</Link></p>
          <p><Link href="/login" className="text-zinc-500 hover:underline">{t.email}</Link></p>
        </div>
      </div>
    </main>
  );
}
