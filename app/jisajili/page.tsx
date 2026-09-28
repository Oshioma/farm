"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

/* Public: a farmer signs up with just a name and a WhatsApp number, then goes
   straight into the same three-question setup an admin invite opens. The PIN
   is chosen on the first question there. Kiswahili first. */
const copy = {
  en: {
    brand: "Shamba Online",
    title: "Open your farm shop",
    intro: "No email or password. Just your name and WhatsApp number, then three quick questions.",
    name: "Your name", namePlaceholder: "e.g. Amina Juma",
    phone: "WhatsApp number", phoneHint: "The number you use on WhatsApp, e.g. 0712 345 678",
    submit: "Start", submitting: "Starting…",
    have: "Already signed up?", signIn: "Sign in with your number",
    email: "Prefer email? Create an account with email",
    error: "Something went wrong. Please try again.",
  },
  sw: {
    brand: "Shamba Online",
    title: "Fungua duka la shamba lako",
    intro: "Hakuna barua pepe wala nenosiri. Jina lako na namba ya WhatsApp tu, kisha maswali matatu mafupi.",
    name: "Jina lako", namePlaceholder: "mf. Amina Juma",
    phone: "Namba ya WhatsApp", phoneHint: "Namba unayotumia kwenye WhatsApp, mf. 0712 345 678",
    submit: "Anza", submitting: "Inaanza…",
    have: "Tayari umesajiliwa?", signIn: "Ingia kwa namba yako",
    email: "Unapendelea barua pepe? Fungua akaunti kwa barua pepe",
    error: "Kuna hitilafu imetokea. Tafadhali jaribu tena.",
  },
};

const input = "mt-2 block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-4 text-lg outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const primary = "inline-flex items-center justify-center gap-1 rounded-full bg-emerald-700 px-6 py-4 text-base font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";

export default function WhatsAppSignupPage() {
  const router = useRouter();
  const [lang, setLang] = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exists, setExists] = useState(false);

  /* Kiswahili unless this device already chose a language. */
  useEffect(() => {
    try {
      if (!window.localStorage.getItem("shamba_language")) setLang("sw");
    } catch {
      setLang("sw");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = copy[lang];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setExists(false);
    try {
      const res = await fetch("/api/signup/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmerName: name.trim(), phone, lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExists(data.code === "exists");
        throw new Error(data.error || t.error);
      }
      router.push(`/start/${data.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
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

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            {exists && (
              <Link href={`/ingia?phone=${encodeURIComponent(phone)}`} className="mt-2 block font-semibold text-red-800 underline">{t.signIn}</Link>
            )}
          </div>
        )}

        <form onSubmit={submit} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <MessageCircle className="h-8 w-8 text-emerald-600" aria-hidden="true" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-1 text-sm text-zinc-600">{t.intro}</p>

          <label className="mt-5 block text-sm font-medium text-zinc-700">
            {t.name}
            <input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder={t.namePlaceholder} autoComplete="name" className={input} />
          </label>

          <label className="mt-4 block text-sm font-medium text-zinc-700">
            {t.phone}
            <input required type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0712 345 678" autoComplete="tel" className={input} />
            <span className="mt-1 block text-xs font-normal text-zinc-500">{t.phoneHint}</span>
          </label>

          <button type="submit" disabled={busy || !name.trim() || phone.replace(/\D/g, "").length < 9} className={"mt-6 w-full " + primary}>
            {busy ? t.submitting : t.submit}<ChevronRight className="h-5 w-5" />
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center text-sm text-zinc-600">
          <p>{t.have} <Link href="/ingia" className="font-semibold text-emerald-800 hover:underline">{t.signIn}</Link></p>
          <p><Link href="/signup" className="text-zinc-500 hover:underline">{t.email}</Link></p>
        </div>
      </div>
    </main>
  );
}
