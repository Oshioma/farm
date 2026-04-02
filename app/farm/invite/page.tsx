"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getFarms } from "@/lib/farm";
import type { Farm } from "@/lib/farm";

type Member = {
  id: string;
  profile_id: string;
  role_on_farm: string;
  created_at: string;
};

type JoinRequest = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
};

function errMsg(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function InvitePage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadData(farmId: string) {
    const [{ data: memberRows }, { data: requestRows }] = await Promise.all([
      supabase.from("farm_members").select("id, profile_id, role_on_farm, created_at").eq("farm_id", farmId),
      supabase.from("join_requests")
        .select("id, user_id, status, created_at")
        .eq("farm_id", farmId)
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
    ]);
    setMembers((memberRows ?? []) as Member[]);
    setJoinRequests((requestRows ?? []) as JoinRequest[]);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const farmRows = await getFarms();
        setFarms(farmRows);
        if (farmRows.length > 0) {
          setActiveFarmId(farmRows[0].id);
          await loadData(farmRows[0].id);
        }
      } catch (err) {
        setError(errMsg(err, "Failed to load"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    loadData(activeFarmId).catch((err) => setError(errMsg(err, "Failed to load")));
  }, [activeFarmId]);

  async function handleAccept(req: JoinRequest) {
    setProcessingId(req.id);
    setError("");
    try {
      // Add to ALL farms (same as invite link behaviour)
      const { data: ownerFarms } = await supabase
        .from("farm_members")
        .select("farm_id")
        .in("profile_id", members.filter((m) => m.role_on_farm === "owner").map((m) => m.profile_id));

      const farmIds = [...new Set((ownerFarms ?? []).map((f: { farm_id: string }) => f.farm_id))];
      if (farmIds.length === 0) farmIds.push(activeFarmId);

      const { data: existing } = await supabase
        .from("farm_members")
        .select("farm_id")
        .eq("profile_id", req.user_id);
      const alreadyIn = new Set((existing ?? []).map((r: { farm_id: string }) => r.farm_id));

      const toInsert = farmIds
        .filter((fid) => !alreadyIn.has(fid))
        .map((fid) => ({ farm_id: fid, profile_id: req.user_id, role_on_farm: "member" }));

      if (toInsert.length > 0) {
        const { error: err } = await supabase.from("farm_members").insert(toInsert);
        if (err) throw err;
      }
      await supabase.from("join_requests").update({ status: "accepted" }).eq("id", req.id);
      await loadData(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to accept request"));
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: string) {
    setProcessingId(id);
    await supabase.from("join_requests").update({ status: "rejected" }).eq("id", id);
    setJoinRequests((prev) => prev.filter((r) => r.id !== id));
    setProcessingId(null);
  }

  async function removeMember(id: string) {
    setRemovingId(id);
    await supabase.from("farm_members").delete().eq("id", id);
    await loadData(activeFarmId);
    setRemovingId(null);
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  const activeFarm = farms.find((f) => f.id === activeFarmId);

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Members</h1>
              {activeFarm && <p className="mt-1 text-sm text-zinc-500">{activeFarm.name}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {farms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFarmId(f.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeFarmId === f.id
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {f.name}
                </button>
              ))}
              <Link
                href="/farm"
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                ← Farm
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">Loading…</div>
        ) : (
          <div className="space-y-6">

            {/* Join requests */}
            {joinRequests.length > 0 && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-amber-900">
                  Join requests
                  <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-sm font-medium text-amber-800">
                    {joinRequests.length}
                  </span>
                </h2>
                <p className="mt-1 text-sm text-amber-700">People requesting access to your farm.</p>
                <div className="mt-4 space-y-2">
                  {joinRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-mono text-zinc-600">{req.user_id}</p>
                        <p className="text-xs text-zinc-400">{fmtDate(req.created_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(req)}
                          disabled={processingId === req.id}
                          className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={processingId === req.id}
                          className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current members */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Members</h2>
              <p className="mt-1 text-sm text-zinc-500">{members.length} {members.length === 1 ? "person has" : "people have"} access to this farm.</p>
              <div className="mt-4 space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-mono text-zinc-500">{m.profile_id}</p>
                      <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.role_on_farm === "owner" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
                      }`}>{m.role_on_farm}</span>
                    </div>
                    {m.role_on_farm !== "owner" && (
                      <button
                        onClick={() => removeMember(m.id)}
                        disabled={removingId === m.id}
                        className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
