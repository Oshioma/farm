"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Leaf, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFarms, getPlants, getZones } from "@/lib/farm";
import type { Farm, Plant, Zone } from "@/lib/farm";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

export default function PlantsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [plantName, setPlantName] = useState("");
  const [plantNotes, setPlantNotes] = useState("");
  const [plantMedicinal, setPlantMedicinal] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [uploading, setUploading] = useState(false);

  const [editPlant, setEditPlant] = useState<Plant | null>(null);
  const [editForm, setEditForm] = useState({ name: "", notes: "", medicinal_properties: "", zone_id: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [promotingToCrop, setPromotingToCrop] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function loadFarms() {
    const farmRows = await getFarms();
    setFarms(farmRows);
    if (farmRows.length > 0) setActiveFarmId(farmRows[0].id);
  }

  async function loadPlants(farmId: string) {
    const rows = await getPlants(farmId);
    setPlants(rows);
  }

  async function loadZones(farmId: string) {
    const rows = await getZones(farmId);
    setZones(rows);
  }

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadFarms();
      } catch (err) {
        setError(errMsg(err, "Failed to load farms"));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    const run = async () => {
      try {
        setLoading(true);
        await Promise.all([loadPlants(activeFarmId), loadZones(activeFarmId)]);
      } catch (err) {
        setError(errMsg(err, "Failed to load plants"));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [activeFarmId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarmId) return;

    try {
      setUploading(true);
      setError("");

      let imageUrl: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${activeFarmId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("plant-images")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("plant-images")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase.from("plants").insert({
        farm_id: activeFarmId,
        name: plantName.trim() || null,
        image_url: imageUrl,
        notes: plantNotes.trim() || null,
        medicinal_properties: plantMedicinal.trim() || null,
        zone_id: zoneId || null,
      });
      if (insertError) throw insertError;

      setFile(null);
      setPreview("");
      setPlantName("");
      setPlantNotes("");
      setPlantMedicinal("");
      setZoneId("");
      setShowUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadPlants(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to upload plant"));
    } finally {
      setUploading(false);
    }
  }

  function openEdit(plant: Plant) {
    setEditPlant(plant);
    setEditForm({
      name: plant.name ?? "",
      notes: plant.notes ?? "",
      medicinal_properties: plant.medicinal_properties ?? "",
      zone_id: plant.zone_id ?? "",
    });
  }

  async function handleSaveEdit() {
    if (!editPlant) return;
    try {
      setSavingEdit(true);
      setError("");
      const { error: updateError } = await supabase
        .from("plants")
        .update({
          name: editForm.name.trim() || null,
          notes: editForm.notes.trim() || null,
          medicinal_properties: editForm.medicinal_properties.trim() || null,
          zone_id: editForm.zone_id || null,
        })
        .eq("id", editPlant.id);
      if (updateError) throw updateError;
      setPlants((prev) =>
        prev.map((p) =>
          p.id === editPlant.id
            ? { ...p, name: editForm.name.trim() || null, notes: editForm.notes.trim() || null, medicinal_properties: editForm.medicinal_properties.trim() || null, zone_id: editForm.zone_id || null }
            : p
        )
      );
      setEditPlant(null);
    } catch (err) {
      setError(errMsg(err, "Failed to save plant"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(plantId: string) {
    try {
      setDeletingId(plantId);
      setError("");
      const { error: deleteError } = await supabase.from("plants").delete().eq("id", plantId);
      if (deleteError) throw deleteError;
      setPlants((prev) => prev.filter((p) => p.id !== plantId));
    } catch (err) {
      setError(errMsg(err, "Failed to delete plant"));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  async function handlePromoteToCrop(plant: Plant) {
    try {
      setPromotingToCrop(true);
      setError("");

      const { error: updateError } = await supabase
        .from("plants")
        .update({ is_crop: true, status: "planned" })
        .eq("id", plant.id);
      if (updateError) throw updateError;

      setPlants((prev) => prev.map((p) => p.id === plant.id ? { ...p, is_crop: true, status: "planned" } : p));
      setEditPlant(null);
      alert(`"${plant.name || "Unnamed plant"}" is now tracked as a crop on the Farm page.`);
    } catch (err) {
      setError(errMsg(err, "Failed to promote plant to crop"));
    } finally {
      setPromotingToCrop(false);
    }
  }

  async function handleDemoteFromCrop(plant: Plant) {
    try {
      setPromotingToCrop(true);
      setError("");

      const { error: updateError } = await supabase
        .from("plants")
        .update({ is_crop: false })
        .eq("id", plant.id);
      if (updateError) throw updateError;

      setPlants((prev) => prev.map((p) => p.id === plant.id ? { ...p, is_crop: false } : p));
      setEditPlant(null);
    } catch (err) {
      setError(errMsg(err, "Failed to update plant"));
    } finally {
      setPromotingToCrop(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const activeFarm = farms.find((f) => f.id === activeFarmId) ?? null;

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Plants
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                {activeFarm?.name ?? "—"} · Photo your plants, name them when you know what they are.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {farms.map((farm) => {
                const isActive = farm.id === activeFarmId;
                return (
                  <button
                    key={farm.id}
                    onClick={() => setActiveFarmId(farm.id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {farm.name}
                  </button>
                );
              })}
              <Link
                href="/farm"
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                ← Farm
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* Upload toggle */}
        <div className="mb-6">
          <button
            onClick={() => setShowUpload((v) => !v)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              showUpload
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <ImagePlus size={15} />
            Add plant
          </button>

          {showUpload ? (
            <div className="mt-4 max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Add plant</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Upload a photo. Name is optional — add it later when you know.
              </p>

              <form onSubmit={handleUpload} className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Photo</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-sm text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-200"
                  />
                </div>

                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-48 w-full rounded-2xl object-cover"
                  />
                ) : null}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Name <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="Tomato, Basil, Unknown weed…"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Notes <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <textarea
                    value={plantNotes}
                    onChange={(e) => setPlantNotes(e.target.value)}
                    className="min-h-[60px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="Growing conditions, observations…"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Medicinal properties <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <textarea
                    value={plantMedicinal}
                    onChange={(e) => setPlantMedicinal(e.target.value)}
                    className="min-h-[60px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="Traditional or known medicinal uses…"
                  />
                </div>

                {zones.length > 0 ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Zone <span className="font-normal text-zinc-400">(optional)</span>
                    </label>
                    <select
                      value={zoneId}
                      onChange={(e) => setZoneId(e.target.value)}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    >
                      <option value="">No zone</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={uploading || (!file && !plantName.trim())}
                  className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : "Save plant"}
                </button>
              </form>
            </div>
          ) : null}
        </div>

        {/* Plant grid */}
        {loading && plants.length === 0 ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : plants.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <Leaf className="mx-auto mb-3 text-zinc-300" size={32} />
            <p className="text-sm text-zinc-500">No plants yet. Add one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {plants.map((plant) => (
              <div
                key={plant.id}
                className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm"
              >
                {/* Delete button */}
                <div className="absolute right-2 top-2 z-10 opacity-0 transition group-hover:opacity-100">
                  {confirmDeleteId === plant.id ? (
                    <button
                      onClick={() => handleDelete(plant.id)}
                      disabled={deletingId === plant.id}
                      className="rounded-full bg-rose-600 px-2 py-1 text-xs font-medium text-white shadow hover:bg-rose-700 disabled:opacity-60"
                    >
                      {deletingId === plant.id ? "…" : "Confirm"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(plant.id)}
                      className="rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
                    >
                      <X size={14} className="text-red-500" />
                    </button>
                  )}
                </div>

                {/* Image / placeholder */}
                <button onClick={() => openEdit(plant)} className="w-full text-left">
                  {plant.image_url ? (
                    <img
                      src={plant.image_url}
                      alt={plant.name ?? "Plant"}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-zinc-100">
                      <Leaf className="text-zinc-300" size={32} />
                    </div>
                  )}
                </button>

                <div className="p-3">
                  <button onClick={() => openEdit(plant)} className="w-full text-left">
                    {plant.name ? (
                      <span className="text-sm font-medium">{plant.name}</span>
                    ) : (
                      <span className="text-sm text-zinc-400 italic">Tap to edit…</span>
                    )}
                    {plant.notes ? (
                      <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{plant.notes}</p>
                    ) : null}
                    {plant.medicinal_properties ? (
                      <p className="mt-0.5 text-xs text-emerald-600 line-clamp-1">Medicinal: {plant.medicinal_properties}</p>
                    ) : null}
                    {plant.is_crop ? (
                      <span className="mt-1 inline-block rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-semibold text-lime-700">Crop</span>
                    ) : null}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit modal */}
        {editPlant ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit plant</h2>
                <button onClick={() => setEditPlant(null)} className="rounded-full p-1 hover:bg-zinc-100">
                  <X size={18} />
                </button>
              </div>

              {editPlant.image_url ? (
                <img src={editPlant.image_url} alt={editPlant.name ?? "Plant"} className="mt-4 h-40 w-full rounded-2xl object-cover" />
              ) : null}

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="Plant name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                    className="min-h-[80px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="Growing conditions, observations…"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Medicinal properties</label>
                  <textarea
                    value={editForm.medicinal_properties}
                    onChange={(e) => setEditForm((p) => ({ ...p, medicinal_properties: e.target.value }))}
                    className="min-h-[80px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="Traditional or known medicinal uses…"
                  />
                </div>

                {zones.length > 0 ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium">Zone</label>
                    <select
                      value={editForm.zone_id}
                      onChange={(e) => setEditForm((p) => ({ ...p, zone_id: e.target.value }))}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    >
                      <option value="">No zone</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="flex-1 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {savingEdit ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditPlant(null)}
                    className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                </div>

                {editPlant.is_crop ? (
                  <button
                    onClick={() => handleDemoteFromCrop(editPlant)}
                    disabled={promotingToCrop}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-60"
                  >
                    {promotingToCrop ? "Updating…" : "Remove from crop tracker"}
                  </button>
                ) : (
                  <button
                    onClick={() => handlePromoteToCrop(editPlant)}
                    disabled={promotingToCrop}
                    className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {promotingToCrop ? "Promoting…" : "Track as crop"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
