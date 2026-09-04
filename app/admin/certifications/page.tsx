"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, RotateCcw, ShieldCheck } from "lucide-react";

type FarmCertification = {
  id: string;
  name: string;
  slug: string | null;
  location: string | null;
  growing_practice: string;
  practice_notes: string | null;
  certification_body: string | null;
  certification_reference: string | null;
  certification_url: string | null;
  certification_expires_on: string | null;
  certification_verified_at: string | null;
  is_active: boolean;
};

function statusOf(farm: FarmCertification) {
  const today = new Date().toISOString().slice(0, 10);
  if (farm.certification_expires_on && farm.certification_expires_on < today) return "expired";
  if (farm.certification_verified_at) return "verified";
  return "pending";
}

export default function CertificationReviewPage() {
  const [farms, setFarms] = useState<FarmCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"pending" | "verified" | "expired" | "all">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/certifications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load certifications");
      setFarms(data.farms ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load certifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(
    () => farms.filter((farm) => filter === "all" || statusOf(farm) === filter),
    [farms, filter]
  );

  async function update(farmId: string, action: "verify" | "reset") {
    setSavingId(farmId);
    setError("");
    try {
      const res = await fetch("/api/admin/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update certification");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update certification");
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Trust and verification</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Organic certification review</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Open the evidence independently, match the certifier and reference, confirm it has not expired, then verify. The public badge changes immediately.</p>
            </div>
            <Link href="/admin" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">Back to admin</Link>
          </div>
        </header>

        {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mb-5 flex flex-wrap gap-2">
          {(["pending", "verified", "expired", "all"] as const).map((value) => (
            <button key={value} onClick={() => setFilter(value)} className={"rounded-full px-4 py-2 text-sm font-medium capitalize " + (filter === value ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-600")}>
              {value} ({value === "all" ? farms.length : farms.filter((farm) => statusOf(farm) === value).length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">Loading evidence…</div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-emerald-700" />
            <p className="mt-3 font-semibold">Nothing in this queue</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((farm) => {
              const status = statusOf(farm);
              const complete = !!farm.certification_body && !!farm.certification_reference && !!farm.certification_url;
              return (
                <article key={farm.id} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold">{farm.name}</h2>
                        <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (status === "verified" ? "bg-emerald-100 text-emerald-800" : status === "expired" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800")}>{status}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">{farm.location || "No location"} · {farm.growing_practice.replaceAll("_", " ")}</p>
                    </div>
                    {farm.slug && <a href={`/${farm.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">View shop <ExternalLink className="h-4 w-4" /></a>}
                  </div>

                  {farm.practice_notes && <p className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">{farm.practice_notes}</p>}

                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                    <div><dt className="text-xs uppercase tracking-wide text-zinc-400">Organisation</dt><dd className="mt-1 font-medium">{farm.certification_body || "Missing"}</dd></div>
                    <div><dt className="text-xs uppercase tracking-wide text-zinc-400">Reference</dt><dd className="mt-1 font-medium">{farm.certification_reference || "Missing"}</dd></div>
                    <div><dt className="text-xs uppercase tracking-wide text-zinc-400">Expiry</dt><dd className="mt-1 font-medium">{farm.certification_expires_on || "Not supplied"}</dd></div>
                  </dl>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {farm.certification_url ? (
                      <a href={farm.certification_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold">
                        Open evidence <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : <span className="text-sm text-red-600">Evidence link missing</span>}
                    {status !== "verified" ? (
                      <button onClick={() => update(farm.id, "verify")} disabled={!complete || status === "expired" || savingId === farm.id} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                        <CheckCircle2 className="h-4 w-4" />{savingId === farm.id ? "Saving…" : "Mark verified"}
                      </button>
                    ) : (
                      <button onClick={() => update(farm.id, "reset")} disabled={savingId === farm.id} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700">
                        <RotateCcw className="h-4 w-4" />Remove verification
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
