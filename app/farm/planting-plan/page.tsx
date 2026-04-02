"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms, getPlantingPlan } from "@/lib/farm";
import type { Farm, PlantingPlanEntry } from "@/lib/farm";

export default function PlantingPlanPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState<string>("");
  const [entries, setEntries] = useState<PlantingPlanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"tree" | "support">("tree");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const farmRows = await getFarms();
        setFarms(farmRows);
        const topLand = farmRows.find((f) => /top land/i.test(f.name)) ?? farmRows[0];
        if (topLand) setActiveFarmId(topLand.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load farms");
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    setLoading(true);
    setError("");
    getPlantingPlan(activeFarmId)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load planting plan"))
      .finally(() => setLoading(false));
  }, [activeFarmId]);

  const trees = entries.filter((e) => e.category === "tree");
  const support = entries.filter((e) => e.category === "support");
  const shown = tab === "tree" ? trees : support;

  const activeFarm = farms.find((f) => f.id === activeFarmId);

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Syntropic Planting Plan
              </h1>
              {activeFarm && (
                <p className="mt-1 text-sm text-zinc-500">{activeFarm.name}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {farms.map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => setActiveFarmId(farm.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    farm.id === activeFarmId
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {farm.name}
                </button>
              ))}
              <Link
                href="/farm"
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                ← Farm
              </Link>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setTab("tree")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              tab === "tree"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            Trees &amp; Fruiting plants
            <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">
              {trees.length}
            </span>
          </button>
          <button
            onClick={() => setTab("support")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              tab === "support"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            Support species
            <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">
              {support.length}
            </span>
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">
            Loading...
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">
            No entries yet. Run the seed SQL in Supabase to populate this plan.
          </div>
        ) : tab === "tree" ? (
          <TreesTable trees={trees} expandedId={expandedId} setExpandedId={setExpandedId} />
        ) : (
          <SupportCards support={support} expandedId={expandedId} setExpandedId={setExpandedId} />
        )}
      </div>
    </main>
  );
}

/* ── Trees table ─────────────────────────────────────────── */

function strataColor(strata: string | null) {
  if (!strata) return "bg-zinc-100 text-zinc-600";
  const s = strata.toLowerCase();
  if (s.includes("emergent")) return "bg-purple-100 text-purple-700";
  if (s.includes("high") || s.includes("pioneer")) return "bg-blue-100 text-blue-700";
  if (s.includes("medium")) return "bg-emerald-100 text-emerald-700";
  return "bg-zinc-100 text-zinc-600";
}

function roleColor(role: string | null) {
  if (!role) return "bg-zinc-100 text-zinc-600";
  const r = role.toLowerCase();
  if (r.includes("legacy")) return "bg-amber-100 text-amber-700";
  if (r.includes("quick cash")) return "bg-green-100 text-green-700";
  if (r.includes("cash")) return "bg-teal-100 text-teal-700";
  if (r.includes("support") || r.includes("biomass")) return "bg-stone-100 text-stone-600";
  return "bg-zinc-100 text-zinc-600";
}

function TreesTable({
  trees,
  expandedId,
  setExpandedId,
}: {
  trees: PlantingPlanEntry[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      {/* Column headers */}
      <div className="hidden grid-cols-[2fr,2fr,1.5fr,1fr,1.5fr,2fr] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 lg:grid">
        <div>Species</div>
        <div>Strata / Height</div>
        <div>Role</div>
        <div>Seedlings</div>
        <div>Target</div>
        <div>Propagation</div>
      </div>

      {trees.map((entry) => {
        const isExpanded = expandedId === entry.id;
        return (
          <div key={entry.id} className="border-b border-zinc-100 last:border-b-0">
            <button
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              className="w-full px-5 py-4 text-left transition hover:bg-zinc-50"
            >
              {/* Mobile layout */}
              <div className="lg:hidden">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{entry.species_name}</p>
                    {entry.strata && (
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${strataColor(entry.strata)}`}>
                        {entry.strata}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {entry.seedlings_to_start != null && (
                      <p className="text-sm font-medium">{entry.seedlings_to_start} seedlings</p>
                    )}
                    {entry.target_count && (
                      <p className="text-xs text-zinc-500">Target: {entry.target_count}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden grid-cols-[2fr,2fr,1.5fr,1fr,1.5fr,2fr] gap-4 items-start lg:grid">
                <p className="font-semibold">{entry.species_name}</p>
                <div>
                  {entry.strata ? (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${strataColor(entry.strata)}`}>
                      {entry.strata}
                    </span>
                  ) : <span className="text-zinc-400">—</span>}
                </div>
                <div>
                  {entry.role ? (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleColor(entry.role)}`}>
                      {entry.role}
                    </span>
                  ) : <span className="text-zinc-400">—</span>}
                </div>
                <p className="text-sm">{entry.seedlings_to_start ?? <span className="text-zinc-400">—</span>}</p>
                <p className="text-sm">{entry.target_count ?? <span className="text-zinc-400">—</span>}</p>
                <p className="text-sm text-zinc-600">{entry.propagation_method ?? <span className="text-zinc-400">—</span>}</p>
              </div>
            </button>

            {/* Expanded notes */}
            {isExpanded && entry.notes && (
              <div className="border-t border-zinc-100 bg-stone-50 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Notes</p>
                <p className="text-sm text-zinc-700 leading-relaxed">{entry.notes}</p>
                {entry.role && (
                  <p className="mt-2 text-xs text-zinc-400">
                    Role: <span className={`ml-1 rounded-full px-2 py-0.5 font-medium ${roleColor(entry.role)}`}>{entry.role}</span>
                  </p>
                )}
              </div>
            )}
            {isExpanded && !entry.notes && (
              <div className="border-t border-zinc-100 bg-stone-50 px-5 py-3 text-sm text-zinc-400">
                No additional notes.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Support species cards ───────────────────────────────── */

function SupportCards({
  support,
  expandedId,
  setExpandedId,
}: {
  support: PlantingPlanEntry[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {support.map((entry) => {
        const isExpanded = expandedId === entry.id;
        return (
          <div key={entry.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{entry.species_name}</h3>
                {entry.strata && (
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${strataColor(entry.strata)}`}>
                    {entry.strata}
                  </span>
                )}
              </div>
              {entry.role && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${roleColor(entry.role)}`}>
                  {entry.role}
                </span>
              )}
            </div>

            {entry.propagation_method && (
              <p className="mt-3 text-xs text-zinc-500">
                <span className="font-medium text-zinc-700">Propagation: </span>
                {entry.propagation_method}
              </p>
            )}

            {entry.notes && (
              <>
                <p className={`mt-3 text-sm text-zinc-600 leading-relaxed ${!isExpanded ? "line-clamp-3" : ""}`}>
                  {entry.notes}
                </p>
                {entry.notes.length > 120 && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="mt-2 text-xs font-medium text-zinc-400 hover:text-zinc-700 transition"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
