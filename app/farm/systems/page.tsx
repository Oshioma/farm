"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, X, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFarms } from "@/lib/farm";
import type { Farm } from "@/lib/farm";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

type SystemDoc = {
  id: string;
  farm_id: string;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  created_at: string | null;
};

function getPreviewUrl(url: string): string | null {
  // Google Docs
  const docsMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) return `https://docs.google.com/document/d/${docsMatch[1]}/preview`;

  // Google Sheets
  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/preview`;

  // Google Slides
  const slidesMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slidesMatch) return `https://docs.google.com/presentation/d/${slidesMatch[1]}/preview`;

  // Google Drive file (try embed)
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;

  return null;
}

export default function SystemsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [docs, setDocs] = useState<SystemDoc[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<"crop_guide" | "sop">("crop_guide");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", description: "", category: "crop_guide" });
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", url: "", description: "", category: "crop_guide" });
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const router = useRouter();

  async function loadDocs(farmId: string) {
    const { data, error: e } = await supabase
      .from("system_docs")
      .select("id, farm_id, title, url, description, category, created_at")
      .eq("farm_id", farmId)
      .order("title");
    if (e) throw new Error(e.message);
    setDocs((data ?? []) as SystemDoc[]);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const farmRows = await getFarms();
        setFarms(farmRows);
        if (farmRows.length > 0) {
          setActiveFarmId(farmRows[0].id);
          await loadDocs(farmRows[0].id);
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
    setLoading(true);
    loadDocs(activeFarmId)
      .catch((err) => setError(errMsg(err, "Failed to load")))
      .finally(() => setLoading(false));
  }, [activeFarmId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarmId || !form.title.trim() || !form.url.trim()) return;
    try {
      setSaving(true);
      setError("");
      const { error: err } = await supabase.from("system_docs").insert({
        farm_id: activeFarmId,
        title: form.title.trim(),
        url: form.url.trim(),
        description: form.description.trim() || null,
        category: form.category,
      });
      if (err) throw err;
      setForm({ title: "", url: "", description: "", category: tab });
      setShowForm(false);
      await loadDocs(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to add"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id: string) {
    try {
      setSavingEditId(id);
      setError("");
      const { error: err } = await supabase.from("system_docs").update({
        title: editForm.title.trim(),
        url: editForm.url.trim(),
        description: editForm.description.trim() || null,
        category: editForm.category,
      }).eq("id", id);
      if (err) throw err;
      setEditingId(null);
      await loadDocs(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to update"));
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);
      const { error: err } = await supabase.from("system_docs").delete().eq("id", id);
      if (err) throw err;
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(errMsg(err, "Failed to delete"));
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(doc: SystemDoc) {
    setEditingId(doc.id);
    setEditForm({ title: doc.title, url: doc.url, description: doc.description ?? "", category: doc.category ?? "crop_guide" });
  }

  const activeFarm = farms.find((f) => f.id === activeFarmId);
  const filteredDocs = docs.filter((d) => (d.category ?? "crop_guide") === tab);
  const inp = "w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900";

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Shamba Farm Manager</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Systems & Docs</h1>
              {activeFarm && <p className="mt-1 text-sm text-zinc-500">{activeFarm.name}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {farms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFarmId(f.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeFarmId === f.id ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {f.name}
                </button>
              ))}
              <Link href="/farm" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
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
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {/* Tabs + Add button */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full border border-zinc-200 p-0.5">
            <button
              onClick={() => { setTab("crop_guide"); setForm((p) => ({ ...p, category: "crop_guide" })); }}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${tab === "crop_guide" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              Crop guides
            </button>
            <button
              onClick={() => { setTab("sop"); setForm((p) => ({ ...p, category: "sop" })); }}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${tab === "sop" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              SOPs
            </button>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setForm((p) => ({ ...p, category: tab })); }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              showForm ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <Plus size={15} />
            Add {tab === "crop_guide" ? "crop guide" : "SOP"}
          </button>
        </div>

        <div className="mb-6">

          {showForm && (
            <form onSubmit={handleAdd} className="mt-4 max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Title</label>
                <input
                  className={inp}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Irrigation system, Planting calendar…"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Google Doc / Drive URL</label>
                <input
                  type="url"
                  className={inp}
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://docs.google.com/document/d/..."
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Category</label>
                <select className={inp} value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                  <option value="crop_guide">Crop guide</option>
                  <option value="sop">SOP</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <textarea
                  className={`${inp} min-h-[60px]`}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="What this document covers…"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {saving ? "Adding…" : "Add document"}
              </button>
            </form>
          )}
        </div>

        {/* Documents list */}
        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">Loading...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <FileText className="mx-auto mb-3 text-zinc-300" size={32} />
            <p className="text-sm text-zinc-500">No {tab === "crop_guide" ? "crop guides" : "SOPs"} yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc) => {
              const isExpanded = expandedId === doc.id;
              const isEditing = editingId === doc.id;
              const previewUrl = getPreviewUrl(doc.url);

              if (isEditing) {
                return (
                  <div key={doc.id} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-3">
                    <input className={inp} value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" />
                    <input type="url" className={inp} value={editForm.url} onChange={(e) => setEditForm((p) => ({ ...p, url: e.target.value }))} placeholder="URL" />
                    <select className={inp} value={editForm.category} onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}>
                      <option value="crop_guide">Crop guide</option>
                      <option value="sop">SOP</option>
                    </select>
                    <textarea className={`${inp} min-h-[60px]`} value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(doc.id)} disabled={savingEditId === doc.id} className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60">
                        {savingEditId === doc.id ? "Saving…" : "Save"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">Cancel</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={doc.id} className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between gap-4 p-5">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <FileText size={20} className="shrink-0 text-zinc-400" />
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{doc.title}</h3>
                        {doc.description && <p className="mt-0.5 text-sm text-zinc-500 truncate">{doc.description}</p>}
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="shrink-0 text-zinc-400" /> : <ChevronDown size={16} className="shrink-0 text-zinc-400" />}
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
                      >
                        Open <ExternalLink size={12} />
                      </a>
                      <button onClick={() => startEdit(doc)} className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100">Edit</button>
                      <button onClick={() => handleDelete(doc.id)} disabled={deletingId === doc.id} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
                        {deletingId === doc.id ? "…" : "Del"}
                      </button>
                    </div>
                  </div>

                  {/* Preview iframe */}
                  {isExpanded && previewUrl && (
                    <div className="border-t border-zinc-100 bg-zinc-50 p-2">
                      <iframe
                        src={previewUrl}
                        className="h-[500px] w-full rounded-xl border border-zinc-200 bg-white"
                        sandbox="allow-scripts allow-same-origin"
                        title={doc.title}
                      />
                    </div>
                  )}

                  {isExpanded && !previewUrl && (
                    <div className="border-t border-zinc-100 p-5 text-center text-sm text-zinc-400">
                      Preview not available for this URL. Click &quot;Open&quot; to view in Google Drive.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
