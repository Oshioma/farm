"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Info, Pencil, Sprout, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFarms, getCrops, getZones } from "@/lib/farm";
import type { Crop, Farm, Zone } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useFarmRole } from "@/hooks/useFarmRole";
import { badgeClass, formatDate } from "@/app/farm/utils";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

const STATUS_OPTIONS = ["planned", "planted", "germinating", "growing", "harvest_ready", "harvested"];

export default function CropsGalleryPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Which card currently has its details overlay flipped open
  const [detailsId, setDetailsId] = useState<string | null>(null);

  // Quick-photo (inline camera/upload straight onto a card, no modal)
  const [quickPhotoId, setQuickPhotoId] = useState<string | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [editCrop, setEditCrop] = useState<Crop | null>(null);
  const [editForm, setEditForm] = useState({
    crop_name: "",
    variety: "",
    status: "planned",
    notes: "",
    medicinal_properties: "",
    zone_ids: [] as string[],
    image_file: null as File | null,
    image_url: "",
  });
  const [editPreview, setEditPreview] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const router = useRouter();
  useFarmSelection({ farms, activeFarmId, setActiveFarmId });
  const { isManager } = useFarmRole(activeFarmId);
  const activeFarmIdRef = useRef(activeFarmId);
  useEffect(() => {
    activeFarmIdRef.current = activeFarmId;
  }, [activeFarmId]);

  async function loadFarms() {
    setFarms(await getFarms());
  }

  async function loadCrops(farmId: string) {
    const rows = await getCrops(farmId);
    if (activeFarmIdRef.current !== farmId) return;
    setCrops(rows);
  }

  async function loadZones(farmId: string) {
    const rows = await getZones(farmId);
    if (activeFarmIdRef.current !== farmId) return;
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
        await Promise.all([loadCrops(activeFarmId), loadZones(activeFarmId)]);
      } catch (err) {
        setError(errMsg(err, "Failed to load crops"));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [activeFarmId]);

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${activeFarmId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("plant-images").upload(path, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("plant-images").getPublicUrl(path);
    return urlData.publicUrl;
  }

  // --- Quick photo: tap camera icon on a card → capture/upload → save immediately ---
  function triggerQuickPhoto(cropId: string) {
    setQuickPhotoId(cropId);
    // Let state settle then open the file picker
    requestAnimationFrame(() => quickInputRef.current?.click());
  }

  async function handleQuickPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    const cropId = quickPhotoId;
    if (quickInputRef.current) quickInputRef.current.value = "";
    if (!file || !cropId) {
      setQuickPhotoId(null);
      return;
    }
    try {
      setError("");
      const imageUrl = await uploadImage(file);
      const { error: updateError } = await supabase.from("crops").update({ image_url: imageUrl }).eq("id", cropId);
      if (updateError) throw updateError;
      setCrops((prev) => prev.map((c) => (c.id === cropId ? { ...c, image_url: imageUrl } : c)));
    } catch (err) {
      setError(errMsg(err, "Failed to update photo"));
    } finally {
      setQuickPhotoId(null);
    }
  }

  // --- Edit modal ---
  function openEdit(crop: Crop) {
    setDetailsId(null);
    setEditCrop(crop);
    setEditForm({
      crop_name: crop.crop_name ?? "",
      variety: crop.variety ?? "",
      status: crop.status ?? "planned",
      notes: crop.notes ?? "",
      medicinal_properties: crop.medicinal_properties ?? "",
      zone_ids: crop.zone_ids?.length ? crop.zone_ids : crop.zone_id ? [crop.zone_id] : [],
      image_file: null,
      image_url: crop.image_url ?? "",
    });
    setEditPreview(crop.image_url ?? "");
  }

  function handleEditFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setEditForm((prev) => ({ ...prev, image_file: f }));
    if (editPreview && editPreview.startsWith("blob:")) URL.revokeObjectURL(editPreview);
    setEditPreview(f ? URL.createObjectURL(f) : editForm.image_url);
  }

  async function handleSaveEdit() {
    if (!editCrop) return;
    try {
      setSavingEdit(true);
      setError("");

      let imageUrl = editForm.image_url;
      if (editForm.image_file) {
        imageUrl = await uploadImage(editForm.image_file);
      }

      const primaryZone = editForm.zone_ids[0] || null;
      const extraZones = editForm.zone_ids.slice(1);
      const { error: updateError } = await supabase
        .from("crops")
        .update({
          crop_name: editForm.crop_name.trim() || "Unnamed crop",
          variety: editForm.variety.trim() || null,
          status: editForm.status,
          notes: editForm.notes.trim() || null,
          medicinal_properties: editForm.medicinal_properties.trim() || null,
          image_url: imageUrl,
          zone_id: primaryZone,
          extra_zone_ids: extraZones.length > 0 ? JSON.stringify(extraZones) : null,
        })
        .eq("id", editCrop.id);
      if (updateError) throw updateError;

      setCrops((prev) =>
        prev.map((c) =>
          c.id === editCrop.id
            ? {
                ...c,
                crop_name: editForm.crop_name.trim() || "Unnamed crop",
                variety: editForm.variety.trim() || null,
                status: editForm.status,
                notes: editForm.notes.trim() || null,
                medicinal_properties: editForm.medicinal_properties.trim() || null,
                image_url: imageUrl,
                zone_id: primaryZone,
                extra_zone_ids: extraZones.length > 0 ? JSON.stringify(extraZones) : null,
                zone_ids: editForm.zone_ids,
              }
            : c
        )
      );
      setEditCrop(null);
      setEditPreview("");
    } catch (err) {
      setError(errMsg(err, "Failed to save crop"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function zoneNames(crop: Crop): string {
    if (crop.zone_ids?.length) {
      return (
        crop.zone_ids
          .map((zid) => zones.find((z) => z.id === zid)?.name)
          .filter(Boolean)
          .join(", ") || "No bed"
      );
    }
    if (crop.zone?.[0]?.name) return crop.zone[0].name;
    if (crop.zone_id) return zones.find((z) => z.id === crop.zone_id)?.name ?? "No bed";
    return "No bed";
  }

  const activeFarm = farms.find((f) => f.id === activeFarmId) ?? null;
  const withFarmContext = (path: string) =>
    activeFarmId ? `${path}?farmId=${encodeURIComponent(activeFarmId)}` : path;

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      {/* Hidden input reused for quick camera/upload from any card */}
      <input
        ref={quickInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleQuickPhotoChange}
        className="hidden"
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Crops gallery</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {activeFarm?.name ?? "—"} · Tap the camera to snap a fresh photo, the pencil to edit, or the info dot for details.
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
                href={withFarmContext("/farm")}
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

        {loading && crops.length === 0 ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : crops.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <Sprout className="mx-auto mb-3 text-zinc-300" size={32} />
            <p className="text-sm text-zinc-500">No crops yet.</p>
            <Link
              href={withFarmContext("/farm")}
              className="mt-3 inline-block rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Add a crop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {crops.map((crop) => {
              const showDetails = detailsId === crop.id;
              const isUploading = quickPhotoId === crop.id;
              return (
                <div
                  key={crop.id}
                  className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm"
                >
                  {/* Image / placeholder */}
                  <div className="relative aspect-square w-full">
                    {crop.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={crop.image_url}
                        alt={crop.crop_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                        <Sprout className="text-zinc-300" size={36} />
                      </div>
                    )}

                    {/* Status badge (top-left) */}
                    {crop.status ? (
                      <span
                        className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${badgeClass(
                          crop.status
                        )}`}
                      >
                        {crop.status.replace(/_/g, " ")}
                      </span>
                    ) : null}

                    {/* Uploading overlay */}
                    {isUploading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
                        Uploading…
                      </div>
                    ) : null}

                    {/* Quick-action icons (always visible — mobile friendly) */}
                    <div className="absolute right-2 top-2 flex items-center gap-1.5">
                      {isManager ? (
                        <>
                          <button
                            onClick={() => triggerQuickPhoto(crop.id)}
                            title="Take / upload a photo"
                            aria-label="Take or upload a photo"
                            className="rounded-full bg-white/90 p-2 text-zinc-700 shadow hover:bg-white"
                          >
                            <Camera size={15} />
                          </button>
                          <button
                            onClick={() => openEdit(crop)}
                            title="Edit crop"
                            aria-label="Edit crop"
                            className="rounded-full bg-white/90 p-2 text-zinc-700 shadow hover:bg-white"
                          >
                            <Pencil size={15} />
                          </button>
                        </>
                      ) : null}
                      <button
                        onClick={() => setDetailsId(showDetails ? null : crop.id)}
                        title="Crop details"
                        aria-label="Crop details"
                        className={`rounded-full p-2 shadow transition ${
                          showDetails ? "bg-zinc-900 text-white" : "bg-white/90 text-zinc-700 hover:bg-white"
                        }`}
                      >
                        <Info size={15} />
                      </button>
                    </div>

                    {/* Details overlay — slides up over the image on info tap */}
                    <div
                      className={`absolute inset-x-0 bottom-0 top-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/60 to-black/10 p-4 text-white transition-opacity duration-200 ${
                        showDetails ? "opacity-100" : "pointer-events-none opacity-0"
                      }`}
                    >
                      <button
                        onClick={() => setDetailsId(null)}
                        aria-label="Close details"
                        className="absolute right-2 top-2 rounded-full bg-white/20 p-1.5 hover:bg-white/30"
                      >
                        <X size={14} />
                      </button>
                      <h3 className="text-base font-semibold leading-tight">{crop.crop_name}</h3>
                      {crop.variety ? <p className="text-xs text-white/80">{crop.variety}</p> : null}
                      <dl className="mt-2 space-y-1 text-[12px] leading-snug">
                        <div className="flex justify-between gap-2">
                          <dt className="text-white/70">Bed</dt>
                          <dd className="text-right font-medium">{zoneNames(crop)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-white/70">Planted</dt>
                          <dd className="text-right font-medium">{formatDate(crop.planted_on)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-white/70">Harvest</dt>
                          <dd className="text-right font-medium">{formatDate(crop.expected_harvest_start)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-white/70">Yield</dt>
                          <dd className="text-right font-medium">
                            {crop.actual_yield_kg ?? crop.estimated_yield_kg ?? "—"}
                            {crop.actual_yield_kg || crop.estimated_yield_kg ? " kg" : ""}
                          </dd>
                        </div>
                      </dl>
                      {crop.notes ? (
                        <p className="mt-2 line-clamp-3 text-[12px] text-white/80">{crop.notes}</p>
                      ) : null}
                      <Link
                        href={`${withFarmContext("/farm")}#crops`}
                        className="mt-3 inline-flex items-center justify-center rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-900 hover:bg-zinc-100"
                      >
                        Open full details →
                      </Link>
                    </div>
                  </div>

                  {/* Name / caption */}
                  <div className="p-3">
                    <div className="truncate text-sm font-medium">{crop.crop_name}</div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {crop.variety ? `${crop.variety} · ` : ""}
                      {zoneNames(crop)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editCrop ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit crop</h2>
              <button onClick={() => setEditCrop(null)} className="rounded-full p-1 hover:bg-zinc-100">
                <X size={18} />
              </button>
            </div>

            {editPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={editPreview}
                alt={editCrop.crop_name}
                className="mt-4 h-44 w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="mt-4 flex h-44 w-full items-center justify-center rounded-2xl bg-zinc-100">
                <Sprout className="text-zinc-300" size={36} />
              </div>
            )}

            <div className="mt-4 space-y-4">
              {/* Photo — take or upload */}
              <div>
                <label className="mb-2 block text-sm font-medium">Photo</label>
                <div className="flex gap-2">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-3 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
                    <Camera size={15} /> Take photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleEditFileChange}
                      className="hidden"
                    />
                  </label>
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-3 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={editForm.crop_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, crop_name: e.target.value }))}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                  placeholder="Crop name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Variety</label>
                <input
                  type="text"
                  value={editForm.variety}
                  onChange={(e) => setEditForm((p) => ({ ...p, variety: e.target.value }))}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                  placeholder="Variety (optional)"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                  className="min-h-[70px] w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                  placeholder="Observations…"
                />
              </div>

              {zones.length > 0 ? (
                <div>
                  <label className="mb-2 block text-sm font-medium">Beds</label>
                  <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-2xl border border-zinc-300 p-3">
                    {zones.map((z) => (
                      <label key={z.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.zone_ids.includes(z.id)}
                          onChange={(e) => {
                            setEditForm((p) => ({
                              ...p,
                              zone_ids: e.target.checked
                                ? [...p.zone_ids, z.id]
                                : p.zone_ids.filter((id) => id !== z.id),
                            }));
                          }}
                          className="rounded border-zinc-300"
                        />
                        {z.name}
                      </label>
                    ))}
                  </div>
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
                  onClick={() => setEditCrop(null)}
                  className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
