"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Shamba Farm Manager
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Reset password</h1>

          {sent ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Check your email for a password reset link.
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-zinc-500">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>
            </>
          )}

          <p className="mt-5 text-center text-sm text-zinc-500">
            <Link href="/login" className="font-medium text-zinc-900 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
