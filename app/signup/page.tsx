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
    title: "Create account",
    email: "Email",
    password: "Password",
    confirm: "Confirm password",
    minChars: "Minimum 6 characters",
    submit: "Create account",
    submitting: "Creating account...",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    mismatch: "Passwords do not match. Please re-enter them.",
    tooShort: "Password must be at least 6 characters long.",
    generic: "Something went wrong. Please try again.",
    checkTitle: "Check your email",
    checkBody: (email: string) => <>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account and sign in.</>,
    backToSignIn: "Back to sign in",
  },
  sw: {
    brand: "Shamba Farm Manager",
    title: "Fungua akaunti",
    email: "Barua pepe",
    password: "Nenosiri",
    confirm: "Thibitisha nenosiri",
    minChars: "Angalau herufi 6",
    submit: "Fungua akaunti",
    submitting: "Inafungua akaunti...",
    haveAccount: "Tayari una akaunti?",
    signIn: "Ingia",
    mismatch: "Manenosiri hayalingani. Tafadhali yaandike tena.",
    tooShort: "Nenosiri lazima liwe na angalau herufi 6.",
    generic: "Kuna hitilafu imetokea. Tafadhali jaribu tena.",
    checkTitle: "Angalia barua pepe yako",
    checkBody: (email: string) => <>Tumetuma kiungo cha uthibitisho kwa <strong>{email}</strong>. Kibonyeze ili kuwasha akaunti yako na uingie.</>,
    backToSignIn: "Rudi kuingia",
  },
};

function SignUpInner() {
  const [lang, setLang] = useLanguage();
  const t = copy[lang];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  // New accounts go straight into the farmer setup wizard.
  const redirectTo = searchParams.get("redirectTo") ?? "/farm/onboarding";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t.mismatch);
      return;
    }

    if (password.length < 6) {
      setError(t.tooShort);
      return;
    }

    setLoading(true);

    try {
      const emailRedirectTo = `${window.location.origin}${redirectTo}`;
      const { error: authError, data } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // If email confirmation is disabled in Supabase, the session is set immediately
      if (data.session) {
        // Drop any router cache entry captured while logged out (a prefetched
        // /farm that middleware answered with a redirect to /login).
        router.refresh();
        router.push(redirectTo);
      } else {
        setLoading(false);
        setDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.generic);
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900";

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{t.brand}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.checkTitle}</h1>
          <p className="mt-3 text-sm text-zinc-600">{t.checkBody(email)}</p>
          <Link
            href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="mt-6 inline-block rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            {t.backToSignIn}
          </Link>
        </div>
      </main>
    );
  }

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
              <label htmlFor="password" className="mb-2 block text-sm font-medium">{t.password}</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-zinc-400">{t.minChars}</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">{t.confirm}</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="off"
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
            {t.haveAccount}{" "}
            <Link
              href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="font-medium text-zinc-900 hover:underline"
            >
              {t.signIn}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-stone-50">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    }>
      <SignUpInner />
    </Suspense>
  );
}
