"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useT, useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

function ResetPasswordInner() {
  const t = useT();
  const [lang, setLang] = useLanguage();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  /* A link from the app's own reset email carries the recovery token. It is
     only handed to Supabase when the farmer submits the form, so opening the
     link on another device, or a mail scanner following it, spends nothing. */
  const tokenHash = searchParams.get("token_hash");

  useEffect(() => {
    if (tokenHash) {
      setReady(true);
      setChecking(false);
      return;
    }

    // Check for Supabase error query params (e.g. expired link redirect)
    const errorDesc = searchParams.get("error_description");
    if (errorDesc) {
      setError(errorDesc.replace(/\+/g, " "));
      setChecking(false);
      return;
    }

    // Session was established server-side via /auth/callback — verify it
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setReady(true);
        setUserEmail(user.email ?? "");
      }
      setChecking(false);
    });
  }, [searchParams, tokenHash]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("Passwords do not match."));
      return;
    }
    if (password.length < 6) {
      setError(t("Password must be at least 6 characters."));
      return;
    }
    setLoading(true);
    setError("");

    if (tokenHash) {
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
      if (verifyError) {
        /* The token was used already or has run out: send the farmer to ask for a fresh link. */
        setReady(false);
        setError(t("This reset link is invalid or has expired."));
        setLoading(false);
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      router.push("/farm");
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-sm">
          <div className="mb-4 flex justify-end">
            <LanguageToggle lang={lang} onChange={setLang} />
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-center text-sm text-zinc-500">
            {t("Verifying reset link…")}
          </div>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-sm">
          <div className="mb-4 flex justify-end">
            <LanguageToggle lang={lang} onChange={setLang} />
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : (
              <p className="text-sm text-zinc-700">
                {t("This reset link is invalid or has expired.")}
              </p>
            )}
            <a
              href="/forgot-password"
              className="mt-4 inline-block text-sm font-medium text-zinc-900 hover:underline"
            >
              {t("Request a new reset link")}
            </a>
          </div>
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {t("Shamba Farm Manager")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("New password")}</h1>
          {userEmail && (
            <p className="mt-2 text-sm text-zinc-500">
              {t("Setting password for")} <strong>{userEmail}</strong>
            </p>
          )}

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">{t("New password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">{t("Confirm password")}</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t("Updating...") : t("Update password")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-stone-50">
          <p className="text-sm text-zinc-500">{t("Loading…")}</p>
        </main>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
