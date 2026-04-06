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

type OrphanedUser = {
  id: string;
  email: string | undefined;
  created_at: string;
};

export default function AdminPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [deletingFarmId, setDeletingFarmId] = useState<string | null>(null);
  const [confirmDeleteFarmId, setConfirmDeleteFarmId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  async function loadData() {
    const res = await fetch("/api/admin/farms");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");
    setFarms(data.farms);
    setMembers(data.members);
    setOrphanedUsers(data.orphanedUsers ?? []);
    setCurrentUserId(data.currentUserId);
  }

  useEffect(() => {
    loadData()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function deleteUser(profileId: string) {
    setDeletingUserId(profileId);
    setConfirmDeleteUserId(null);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      setSuccessMsg("User deleted successfully");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  }

  async function deleteFarm(farmId: string) {
    setDeletingFarmId(farmId);
    setConfirmDeleteFarmId(null);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/admin/delete-farm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete farm");
      setSuccessMsg("Farm deleted successfully");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete farm");
    } finally {
      setDeletingFarmId(null);
    }
  }

  function membersForFarm(farmId: string) {
    return members.filter((m) => m.farm_id === farmId);
  }

  // Deduplicate users across all farms
  function allUniqueUsers() {
    const seen = new Map<string, Member>();
    for (const m of members) {
      if (!seen.has(m.profile_id)) seen.set(m.profile_id, m);
    }
    return Array.from(seen.values());
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  const uniqueUsers = allUniqueUsers();

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Super Admin</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {farms.length} {farms.length === 1 ? "farm" : "farms"} &middot;{" "}
                {uniqueUsers.length} {uniqueUsers.length === 1 ? "user" : "users"}
              </p>
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
        ) : (
          <div className="space-y-6">

            {/* All Users section */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">All Users</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {uniqueUsers.length} {uniqueUsers.length === 1 ? "user" : "users"} in the system.
                Delete removes the user from all farms and deletes their account.
              </p>
              {uniqueUsers.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-400">No users found.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {uniqueUsers.map((u) => {
                    const userFarms = members
                      .filter((m) => m.profile_id === u.profile_id)
                      .map((m) => {
                        const farm = farms.find((f) => f.id === m.farm_id);
                        return { farmName: farm?.name ?? "Unknown", role: m.role_on_farm };
                      });
                    const isYou = u.profile_id === currentUserId;

                    return (
                      <div
                        key={u.profile_id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            {u.user_email ?? "No email"}
                            {isYou && <span className="ml-1 text-xs text-zinc-400">(you)</span>}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            {userFarms.map((uf, i) => (
                              <span key={i} className="text-xs text-zinc-500">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                    uf.role === "owner"
                                      ? "bg-zinc-900 text-white"
                                      : "bg-zinc-100 text-zinc-600"
                                  }`}
                                >
                                  {uf.role}
                                </span>{" "}
                                {uf.farmName}
                              </span>
                            ))}
                            {!u.user_email && (
                              <span className="text-xs text-zinc-400">
                                ID: {u.profile_id.slice(0, 8)}&hellip;
                              </span>
                            )}
                          </div>
                        </div>
                        {!isYou && (
                          <div>
                            {confirmDeleteUserId === u.profile_id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => deleteUser(u.profile_id)}
                                  disabled={deletingUserId === u.profile_id}
                                  className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  {deletingUserId === u.profile_id ? "Deleting..." : "Confirm delete"}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteUserId(null)}
                                  className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setConfirmDeleteUserId(u.profile_id);
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
                    );
                  })}
                </div>
              )}
            </div>

            {/* Orphaned users (signed up but not on any farm) */}
            {orphanedUsers.length > 0 && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-amber-900">
                  Users without a farm
                  <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-sm font-medium text-amber-800">
                    {orphanedUsers.length}
                  </span>
                </h2>
                <p className="mt-1 text-sm text-amber-700">
                  Signed up but never joined or created a farm.
                </p>
                <div className="mt-4 space-y-2">
                  {orphanedUsers.map((u) => {
                    const isYou = u.id === currentUserId;
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            {u.email ?? "No email"}
                            {isYou && <span className="ml-1 text-xs text-zinc-400">(you)</span>}
                          </p>
                          <p className="text-xs text-zinc-400">
                            Signed up {fmtDate(u.created_at)}
                          </p>
                        </div>
                        {!isYou && (
                          <div>
                            {confirmDeleteUserId === u.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  disabled={deletingUserId === u.id}
                                  className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  {deletingUserId === u.id ? "Deleting..." : "Confirm delete"}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteUserId(null)}
                                  className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setConfirmDeleteUserId(u.id);
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
                    );
                  })}
                </div>
              </div>
            )}

            {/* Farms section */}
            {farms.length === 0 ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
                No farms found.
              </div>
            ) : (
              farms.map((farm) => {
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
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            farm.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {farm.is_active ? "Active" : "Inactive"}
                        </span>
                        {confirmDeleteFarmId === farm.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteFarm(farm.id)}
                              disabled={deletingFarmId === farm.id}
                              className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              {deletingFarmId === farm.id ? "Deleting..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteFarmId(null)}
                              className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setConfirmDeleteFarmId(farm.id);
                              setSuccessMsg("");
                            }}
                            className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete farm
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-medium text-zinc-600">
                        {farmMembers.length} {farmMembers.length === 1 ? "member" : "members"}
                      </p>
                      {farmMembers.length > 0 && (
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
                              {m.profile_id !== currentUserId && (
                                <div>
                                  {confirmDeleteUserId === m.profile_id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => deleteUser(m.profile_id)}
                                        disabled={deletingUserId === m.profile_id}
                                        className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                      >
                                        {deletingUserId === m.profile_id ? "Deleting..." : "Confirm delete"}
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteUserId(null)}
                                        className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setConfirmDeleteUserId(m.profile_id);
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
              })
            )}
          </div>
        )}
      </div>
    </main>
  );
}
