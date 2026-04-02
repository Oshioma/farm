"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Leaf } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFarms, getPlants } from "@/lib/farm";
import type { Farm, Plant } from "@/lib/farm";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

export default function PlantsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [plantName, setPlantName] = useState("");
  const [uploading, setUploading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

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
        await loadPlants(activeFarmId);
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
      });
      if (insertError) throw insertError;

      setFile(null);
      setPreview("");
      setPlantName("");
      setShowUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadPlants(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to upload plant"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveName(plantId: string) {
    if (!editName.trim() && plants.find((p) => p.id === plantId)?.name === null) {
      setEditingId(null);
      return;
    }
    try {
      setSavingId(plantId);
      const { error: updateError } = await supabase
        .from("plants")
        .update({ name: editName.trim() || null })
        .eq("id", plantId);
      if (updateError) throw updateError;
      setPlants((prev) =>
        prev.map((p) => (p.id === plantId ? { ...p, name: editName.trim() || null } : p))
      );
    } catch (err) {
      setError(errMsg(err, "Failed to save name"));
    } finally {
      setSavingId(null);
      setEditingId(null);
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
                className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm"
              >
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

                <div className="p-3">
                  {editingId === plant.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleSaveName(plant.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName(plant.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      disabled={savingId === plant.id}
                      className="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-900"
                      placeholder="Enter name…"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(plant.id);
                        setEditName(plant.name ?? "");
                      }}
                      className="w-full text-left"
                    >
                      {plant.name ? (
                        <span className="text-sm font-medium">{plant.name}</span>
                      ) : (
                        <span className="text-sm text-zinc-400 italic">Tap to name…</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
