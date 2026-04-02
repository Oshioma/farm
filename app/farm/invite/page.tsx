"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getFarms } from "@/lib/farm";
import type { Farm } from "@/lib/farm";

type Member = {
  id: string;
  profile_id: string;
  role_on_farm: string;
  created_at: string;
};

type Invite = {
  id: string;
  token: string;
  invited_email: string | null;
  created_at: string;
  expires_at: string;
  used_by: string | null;
};

function errMsg(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function InvitePage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();

  async function loadData(farmId: string) {
    const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
      supabase.from("farm_members").select("id, profile_id, role_on_farm, created_at").eq("farm_id", farmId),
      supabase.from("farm_invites")
        .select("id, token, invited_email, created_at, expires_at, used_by")
        .eq("farm_id", farmId)
        .is("used_by", null)
        .order("created_at", { ascending: false }),
    ]);
    setMembers((memberRows ?? []) as Member[]);
    setInvites((inviteRows ?? []) as Invite[]);
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
    setNewLink("");
  }, [activeFarmId]);

  async function generateLink() {
    setGeneratingLink(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: err } = await supabase.from("farm_invites").insert({
        farm_id: activeFarmId,
        token,
        created_by: user?.id ?? null,
        expires_at: expires,
        used_by: null,
      });
      if (err) throw err;
      const origin = window.location.origin;
      setNewLink(`${origin}/join?token=${token}`);
      await loadData(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to generate link"));
    } finally {
      setGeneratingLink(false);
    }
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function revokeInvite(id: string) {
    setRemovingId(id);
    await supabase.from("farm_invites").delete().eq("id", id);
    await loadData(activeFarmId);
    setRemovingId(null);
  }

  async function removeMember(id: string) {
    setRemovingId(id);
    await supabase.from("farm_members").delete().eq("id", id);
    await loadData(activeFarmId);
    setRemovingId(null);
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
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Invite members</h1>
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

            {/* Generate invite link */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Invite someone</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Generate a one-use link and share it. The link expires in 7 days.
              </p>
              <button
                onClick={generateLink}
                disabled={generatingLink}
                className="mt-4 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {generatingLink ? "Generating…" : "Generate invite link"}
              </button>

              {newLink && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="flex-1 truncate text-sm font-mono text-zinc-700">{newLink}</p>
                  <button
                    onClick={() => copyLink(newLink)}
                    className="shrink-0 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>

            {/* Pending invites */}
            {invites.length > 0 && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Pending invites</h2>
                <p className="mt-1 text-sm text-zinc-500">Not yet accepted.</p>
                <div className="mt-4 space-y-2">
                  {invites.map((inv) => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    const link = `${origin}/join?token=${inv.token}`;
                    return (
                      <div key={inv.id} className="flex items-center gap-3 rounded-2xl border border-zinc-100 px-4 py-3">
                        <p className="flex-1 truncate text-sm font-mono text-zinc-500">{link}</p>
                        <button
                          onClick={() => copyLink(link)}
                          className="shrink-0 rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => revokeInvite(inv.id)}
                          disabled={removingId === inv.id}
                          className="shrink-0 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          Revoke
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Current members */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Members</h2>
              <p className="mt-1 text-sm text-zinc-500">{members.length} people have access to this farm.</p>
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
