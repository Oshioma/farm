"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getFarms, getZones, getCrops } from "@/lib/farm";
import type { Farm, Zone, Crop } from "@/lib/farm";
import { ZoneForm } from "@/app/farm/components/ZoneForm";
import type { ZoneFormData } from "@/app/farm/components/ZoneForm";
import { badgeClass } from "@/app/farm/utils";
import { useFarmSelection } from "@/hooks/useFarmSelection";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

export default function ZonesPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeForm, setActiveForm] = useState<"create" | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingZoneForm, setEditingZoneForm] = useState<ZoneFormData>({
    name: "",
    code: "",
    size_acres: "",
  });
  const [savingZoneId, setSavingZoneId] = useState<string | null>(null);

  useFarmSelection({ farms, activeFarmId, setActiveFarmId });

  useEffect(() => {
    (async () => {
      try {
        const farmRows = await getFarms();
        setFarms(farmRows);
      } catch (err) {
        setError(errMsg(err, "Failed to load farms"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [zoneRows, cropRows] = await Promise.all([
          getZones(activeFarmId),
          getCrops(activeFarmId),
        ]);
        setZones(zoneRows);
        setCrops(cropRows);
      } catch (err) {
        setError(errMsg(err, "Failed to load zones"));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeFarmId]);

  const activeFarm = useMemo(
    () => farms.find((f) => f.id === activeFarmId) ?? null,
    [farms, activeFarmId]
  );

  async function loadZones() {
    if (!activeFarmId) return;
    try {
      const [zoneRows, cropRows] = await Promise.all([
        getZones(activeFarmId),
        getCrops(activeFarmId),
      ]);
      setZones(zoneRows);
      setCrops(cropRows);
    } catch (err) {
      setError(errMsg(err, "Failed to reload zones"));
    }
  }

  async function handleCreateZone(data: ZoneFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      const name = data.name.trim();
      if (!name) throw new Error("Zone name is required.");

      const { error: insertError } = await supabase.from("zones").insert({
        farm_id: activeFarmId,
        name,
        code: data.code.trim() || null,
        size_acres: data.size_acres ? Number(data.size_acres) : null,
        is_active: true,
      });
      if (insertError) throw insertError;

      await loadZones();
      setActiveForm(null);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to add zone"));
      return false;
    }
  }

  function startEditZone(zoneId: string) {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;
    setEditingZoneForm({
      name: zone.name,
      code: zone.code || "",
      size_acres: zone.size_acres?.toString() || "",
    });
    setEditingZoneId(zoneId);
  }

  async function handleUpdateZone(data: ZoneFormData): Promise<boolean> {
    if (!editingZoneId) return false;
    try {
      setSavingZoneId(editingZoneId);
      setError("");
      const name = data.name.trim();
      if (!name) throw new Error("Zone name is required.");

      const { error: updateError } = await supabase
        .from("zones")
        .update({
          name,
          code: data.code.trim() || null,
          size_acres: data.size_acres ? Number(data.size_acres) : null,
        })
        .eq("id", editingZoneId);
      if (updateError) throw updateError;

      setEditingZoneId(null);
      setEditingZoneForm({ name: "", code: "", size_acres: "" });
      await loadZones();
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to update zone"));
      return false;
    } finally {
      setSavingZoneId(null);
    }
  }

  async function handleDeleteZone(zoneId: string) {
    if (!confirm("Are you sure you want to delete this zone?")) return;
    try {
      setError("");
      const { error: deleteError } = await supabase
        .from("zones")
        .delete()
        .eq("id", zoneId);
      if (deleteError) throw deleteError;

      setEditingZoneId(null);
      setEditingZoneForm({ name: "", code: "", size_acres: "" });
      await loadZones();
    } catch (err) {
      setError(errMsg(err, "Failed to delete zone"));
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 text-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-zinc-500">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Zone Manager
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {activeFarm?.name ?? "Farm Manager"}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {farms.map((farm) => {
                const isActive = farm.id === activeFarmId;
                return (
                  <button
                    key={farm.id}
                    onClick={() => setActiveFarmId(farm.id)}
                    className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {farm.name}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Navigation bar */}
        <nav className="mb-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <Link
              href="/farm"
              className="rounded-full border border-zinc-100 px-3 py-1.5 font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              Farm
            </Link>
            <a
              href="#"
              className="rounded-full border border-zinc-900 px-3 py-1.5 font-medium text-zinc-900"
            >
              Zones
            </a>
          </div>
        </nav>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {activeFarm && (
          <div className="space-y-6">
            {/* Create Zone Form */}
            {activeForm === "create" && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Add new zone</h2>
                  <button
                    onClick={() => setActiveForm(null)}
                    className="text-sm text-zinc-400 hover:text-zinc-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-w-sm">
                  <ZoneForm
                    onSubmit={async (data) => {
                      return await handleCreateZone(data);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Zones Grid */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Zones</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Manage all zones in {activeFarm.name}
                  </p>
                </div>
                <button
                  onClick={() => setActiveForm(activeForm === "create" ? null : "create")}
                  className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  {activeForm === "create" ? "Cancel" : "+ Add zone"}
                </button>
              </div>

              {zones.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No zones yet — create one to get started.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {zones.map((zone) => {
                    const zoneCrops = crops.filter(
                      (c) => c.zone_ids?.includes(zone.id) || c.zone_id === zone.id
                    );
                    const isEditing = editingZoneId === zone.id;

                    return (
                      <div
                        key={zone.id}
                        className={`rounded-2xl border transition ${
                          isEditing
                            ? "border-zinc-900 bg-zinc-50"
                            : "border-zinc-200 bg-white hover:shadow-md"
                        } p-4`}
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold">Edit zone</h3>
                            <div>
                              <label className="mb-1 block text-xs font-medium">
                                Zone name
                              </label>
                              <input
                                type="text"
                                value={editingZoneForm.name}
                                onChange={(e) =>
                                  setEditingZoneForm((p) => ({
                                    ...p,
                                    name: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                                placeholder="Zone name"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium">
                                  Code
                                </label>
                                <input
                                  type="text"
                                  value={editingZoneForm.code}
                                  onChange={(e) =>
                                    setEditingZoneForm((p) => ({
                                      ...p,
                                      code: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                                  placeholder="e.g. B1"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium">
                                  Size (acres)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editingZoneForm.size_acres}
                                  onChange={(e) =>
                                    setEditingZoneForm((p) => ({
                                      ...p,
                                      size_acres: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                                  placeholder="0.5"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={async () => {
                                  const ok = await handleUpdateZone(editingZoneForm);
                                  if (ok) {
                                    setEditingZoneId(null);
                                    setEditingZoneForm({
                                      name: "",
                                      code: "",
                                      size_acres: "",
                                    });
                                  }
                                }}
                                disabled={
                                  !editingZoneForm.name.trim() ||
                                  savingZoneId === editingZoneId
                                }
                                className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                              >
                                {savingZoneId === editingZoneId ? "Saving…" : "Save"}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingZoneId(null);
                                  setEditingZoneForm({
                                    name: "",
                                    code: "",
                                    size_acres: "",
                                  });
                                }}
                                className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeleteZone(zone.id)}
                                className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-3 flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold">{zone.name}</p>
                                {zone.code && (
                                  <p className="text-xs text-zinc-400">{zone.code}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {zone.size_acres && (
                                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                                    {zone.size_acres} ac
                                  </span>
                                )}
                                <button
                                  onClick={() => startEditZone(zone.id)}
                                  className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                            {zoneCrops.length > 0 ? (
                              <ul className="space-y-1">
                                {zoneCrops.map((c) => (
                                  <li
                                    key={c.id}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-zinc-700">
                                      {c.crop_name}
                                      {c.variety ? ` · ${c.variety}` : ""}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(
                                        c.status
                                      )}`}
                                    >
                                      {c.status}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-zinc-400">
                                No crops assigned yet.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
