"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Farm = {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  size_acres: number | null;
  is_active: boolean;
  created_at: string;
};

type Member = {
  id: string;
  farm_id: string;
  profile_id: string;
  user_email: string | null;
  role_on_farm: string;
  created_at: string;
};

export default function AdminPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  async function loadData() {
    const res = await fetch("/api/admin/farms");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");
    setFarms(data.farms);
    setMembers(data.members);
    setCurrentUserId(data.currentUserId);
  }

  useEffect(() => {
    loadData()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function deleteUser(profileId: string, farmId: string) {
    setDeletingId(profileId);
    setConfirmDeleteId(null);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/members/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, farmId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      setSuccessMsg("User deleted successfully");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  }

  function membersForFarm(farmId: string) {
    return members.filter((m) => m.farm_id === farmId);
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Admin</h1>
              <p className="mt-1 text-sm text-zinc-500">All farms and members</p>
            </div>
            <Link
              href="/farm"
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              &larr; Farm
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMsg}</div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
            Loading&hellip;
          </div>
        ) : farms.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
            No farms found.
          </div>
        ) : (
          <div className="space-y-6">
            {farms.map((farm) => {
              const farmMembers = membersForFarm(farm.id);
              return (
                <div key={farm.id} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">{farm.name}</h2>
                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-zinc-500">
                        {farm.location && <span>{farm.location}</span>}
                        {farm.size_acres != null && <span>{farm.size_acres} acres</span>}
                        <span>Created {fmtDate(farm.created_at)}</span>
                      </div>
                    </div>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        farm.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {farm.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium text-zinc-600">
                      {farmMembers.length} {farmMembers.length === 1 ? "member" : "members"}
                    </p>
                    {farmMembers.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-400">No members.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {farmMembers.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-zinc-900">
                                {m.user_email ?? "No email"}
                              </p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                    m.role_on_farm === "owner"
                                      ? "bg-zinc-900 text-white"
                                      : "bg-zinc-100 text-zinc-600"
                                  }`}
                                >
                                  {m.role_on_farm}
                                </span>
                                {m.profile_id === currentUserId && (
                                  <span className="text-xs text-zinc-400">(you)</span>
                                )}
                                {!m.user_email && (
                                  <span className="text-xs text-zinc-400">
                                    ID: {m.profile_id.slice(0, 8)}&hellip;
                                  </span>
                                )}
                              </div>
                            </div>
                            {m.role_on_farm !== "owner" && m.profile_id !== currentUserId && (
                              <div>
                                {confirmDeleteId === m.profile_id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => deleteUser(m.profile_id, farm.id)}
                                      disabled={deletingId === m.profile_id}
                                      className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                    >
                                      {deletingId === m.profile_id ? "Deleting..." : "Confirm delete"}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setConfirmDeleteId(m.profile_id);
                                      setSuccessMsg("");
                                    }}
                                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                  >
                                    Delete user
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
