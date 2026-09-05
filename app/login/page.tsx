"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";

const copy = {
  en: {
    brand: "Shamba Farm Manager",
    title: "Sign in",
    email: "Email",
    password: "Password",
    forgot: "Forgot password?",
    submit: "Sign in",
    submitting: "Signing in...",
    noAccount: "No account?",
    create: "Create one",
  },
  sw: {
    brand: "Shamba Farm Manager",
    title: "Ingia",
    email: "Barua pepe",
    password: "Nenosiri",
    forgot: "Umesahau nenosiri?",
    submit: "Ingia",
    submitting: "Inaingia...",
    noAccount: "Huna akaunti?",
    create: "Fungua moja",
  },
};

function LoginInner() {
  const [lang, setLang] = useLanguage();
  const t = copy[lang];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/farm";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.refresh();
      router.push(redirectTo);
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900";

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <LanguageToggle lang={lang} onChange={setLang} />
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{t.brand}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.title}</h1>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">{t.email}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">{t.password}</label>
                <Link href="/forgot-password" className="text-xs text-zinc-500 hover:underline">
                  {t.forgot}
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t.submitting : t.submit}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-500">
            {t.noAccount}{" "}
            <Link
              href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="font-medium text-zinc-900 hover:underline"
            >
              {t.create}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-stone-50">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    }>
      <LoginInner />
    </Suspense>
  );
}
