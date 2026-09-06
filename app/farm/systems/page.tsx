"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, X, FileText, ChevronDown, ChevronUp, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFarms } from "@/lib/farm";
import type { Farm } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useFarmRole } from "@/hooks/useFarmRole";
import { useT, useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

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
  url: string | null;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  created_at: string | null;
};

/** Extract the document ID from a Google Docs / Drive / Sheets / Slides URL */
function extractDocId(url: string): string | null {
  const patterns = [
    /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getPreviewUrl(url: string): string | null {
  const docsMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) return `https://docs.google.com/document/d/${docsMatch[1]}/preview`;

  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/preview`;

  const slidesMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slidesMatch) return `https://docs.google.com/presentation/d/${slidesMatch[1]}/preview`;

  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;

  return null;
}

export default function SystemsPage() {
  const t = useT();
  const [lang, setLang] = useLanguage();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [docs, setDocs] = useState<SystemDoc[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [tab, setTab] = useState<"crop_guide" | "sop">("crop_guide");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", description: "", category: "crop_guide" });
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", url: "", description: "", category: "crop_guide" });
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [previewDoc, setPreviewDoc] = useState<SystemDoc | null>(null);

  const router = useRouter();
  useFarmSelection({ farms, activeFarmId, setActiveFarmId });
  const { isManager } = useFarmRole(activeFarmId);
  const activeFarmIdRef = useRef(activeFarmId);
  useEffect(() => {
    activeFarmIdRef.current = activeFarmId;
  }, [activeFarmId]);

  async function loadDocs(farmId: string) {
    const { data, error: e } = await supabase
      .from("system_docs")
      .select("id, farm_id, title, url, description, category, subcategory, created_at")
      .eq("farm_id", farmId)
      .order("title");
    if (e) throw new Error(e.message);
    if (activeFarmIdRef.current !== farmId) return;
    setDocs((data ?? []) as SystemDoc[]);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const farmRows = await getFarms();
        setFarms(farmRows);
      } catch (err) {
        setError(errMsg(err, t("Failed to load")));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;
    setLoading(true);
    loadDocs(activeFarmId)
      .catch((err) => setError(errMsg(err, t("Failed to load"))))
      .finally(() => setLoading(false));
  }, [activeFarmId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarmId || !form.title.trim()) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const { error: err } = await supabase.from("system_docs").insert({
        farm_id: activeFarmId,
        title: form.title.trim(),
        url: form.url.trim(),
        description: form.description.trim() || null,
        category: form.category,
      });
      if (err) throw err;
      setSuccess(t("Document added."));
      setForm({ title: "", url: "", description: "", category: tab });
      setShowForm(false);
      await loadDocs(activeFarmId);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(errMsg(err, t("Failed to add")));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id: string) {
    try {
      setSavingEditId(id);
      setError("");
      setSuccess("");
      const { error: err } = await supabase.from("system_docs").update({
        title: editForm.title.trim(),
        url: editForm.url.trim(),
        description: editForm.description.trim() || null,
        category: editForm.category,
      }).eq("id", id);
      if (err) throw err;
      setSuccess(t("Document updated."));
      setEditingId(null);
      await loadDocs(activeFarmId);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(errMsg(err, t("Failed to update")));
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("Delete this document?"))) return;
    try {
      setDeletingId(id);
      const { error: err } = await supabase.from("system_docs").delete().eq("id", id);
      if (err) throw err;
      setDocs((prev) => prev.filter((d) => d.id !== id));
      if (editingId === id) { setEditingId(null); }
      if (previewDoc?.id === id) setPreviewDoc(null);
    } catch (err) {
      setError(errMsg(err, t("Failed to delete")));
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(doc: SystemDoc) {
    setEditingId(doc.id);
    setEditForm({ title: doc.title, url: doc.url ?? "", description: doc.description ?? "", category: doc.category ?? "crop_guide" });
    setShowForm(true);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ title: "", url: "", description: "", category: tab });
    setShowForm(false);
    setError("");
    setSuccess("");
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeFarm = farms.find((f) => f.id === activeFarmId);

  const filteredDocs = docs.filter((d) => {
    if ((d.category ?? "crop_guide") !== tab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return d.title.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  // Summary stats for current tab
  const tabDocs = docs.filter((d) => (d.category ?? "crop_guide") === tab);
  const withContent = tabDocs.filter((d) => d.description || (d.url && extractDocId(d.url))).length;
  const withGoogleDoc = tabDocs.filter((d) => d.url && extractDocId(d.url)).length;

  const previewUrl = previewDoc?.url ? getPreviewUrl(previewDoc.url) : null;
  const inp = "w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900";

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{t("Shamba Farm Manager")}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("Systems & Docs")}</h1>
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
                {t("← Farm")}
              </Link>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                {t("Sign out")}
              </button>
              <LanguageToggle lang={lang} onChange={setLang} />
            </div>
          </div>
        </header>

        {/* Summary Stats Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {tab === "crop_guide" ? t("Crop Guides") : t("SOPs")}
            </p>
            <p className="mt-1 text-2xl font-bold">{tabDocs.length}</p>
            <p className="text-xs text-zinc-400">{t("Documents")}</p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("With Content")}</p>
            <p className="mt-1 text-2xl font-bold">{withContent}</p>
            <p className="text-xs text-zinc-400">{t("Description or Google Doc")}</p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("Google Docs")}</p>
            <p className="mt-1 text-2xl font-bold">{withGoogleDoc}</p>
            <p className="text-xs text-zinc-400">{t("Linked documents")}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}
        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
        )}

        {/* Tabs + Search + Add button */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full border border-zinc-200 p-0.5">
            <button
              onClick={() => { setTab("crop_guide"); setForm((p) => ({ ...p, category: "crop_guide" })); setPreviewDoc(null); }}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${tab === "crop_guide" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              {t("Crop guides")}
            </button>
            <button
              onClick={() => { setTab("sop"); setForm((p) => ({ ...p, category: "sop" })); setPreviewDoc(null); }}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${tab === "sop" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              {t("SOPs")}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search...")}
                className="rounded-full border border-zinc-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-zinc-400"
              />
            </div>
            {isManager && (
              <button
                onClick={() => { if (showForm && !editingId) { resetForm(); } else { resetForm(); setShowForm(true); setForm((p) => ({ ...p, category: tab })); } }}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  showForm && !editingId ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <Plus size={15} />
                {tab === "crop_guide" ? t("Add crop guide") : t("Add SOP")}
              </button>
            )}
          </div>
        </div>


        {/* Create / Edit Form */}
        {isManager && showForm && (
          <div className="mb-6">
            <form onSubmit={editingId ? (e) => { e.preventDefault(); handleSaveEdit(editingId); } : handleAdd} className="max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold">{editingId ? t("Edit Document") : tab === "crop_guide" ? t("Add Crop Guide") : t("Add SOP")}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("Title")}</label>
                  <input
                    className={inp}
                    value={editingId ? editForm.title : form.title}
                    onChange={(e) => editingId ? setEditForm((p) => ({ ...p, title: e.target.value })) : setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder={t("Irrigation system, Planting calendar…")}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("Category")}</label>
                  <select
                    className={inp}
                    value={editingId ? editForm.category : form.category}
                    onChange={(e) => editingId ? setEditForm((p) => ({ ...p, category: e.target.value })) : setForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    <option value="crop_guide">{t("Crop guide")}</option>
                    <option value="sop">{t("SOP")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t("Description / SOP Content")}</label>
                <textarea
                  className={`${inp} min-h-[120px]`}
                  rows={8}
                  value={editingId ? editForm.description : form.description}
                  onChange={(e) => editingId ? setEditForm((p) => ({ ...p, description: e.target.value })) : setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder={t("Write the SOP steps, instructions, or notes here… No Google Doc needed.")}
                  style={{ resize: "vertical", lineHeight: 1.6 }}
                />
                <p className="mt-1 text-[11px] text-zinc-400">{t("Write your SOP directly here, or link a Google Doc below (or both).")}</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  {t("Google Doc / Drive URL")} <span className="font-normal text-zinc-400">{t("(optional)")}</span>
                </label>
                <input
                  type="text"
                  className={inp}
                  value={editingId ? editForm.url : form.url}
                  onChange={(e) => editingId ? setEditForm((p) => ({ ...p, url: e.target.value })) : setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://docs.google.com/document/d/..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving || savingEditId !== null}
                  className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
                >
                  {saving || savingEditId ? t("Saving…") : editingId ? t("Save Changes") : t("Add document")}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                >
                  {t("Cancel")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Documents list + Google Doc Preview Pane */}
        <div className={`grid gap-6 ${previewDoc && previewUrl ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          {/* List */}
          <div>
            {loading ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">{t("Loading...")}</div>
            ) : filteredDocs.length === 0 ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
                <FileText className="mx-auto mb-3 text-zinc-300" size={32} />
                <p className="text-sm text-zinc-500">
                  {search.trim()
                    ? (tab === "crop_guide" ? t("No crop guides match your search.") : t("No SOPs match your search."))
                    : (tab === "crop_guide" ? t("No crop guides yet. Add one above.") : t("No SOPs yet. Add one above."))}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocs.map((doc) => {
                  const isExpanded = expandedIds.has(doc.id);
                  const isEditing = editingId === doc.id;
                  const hasDescription = !!doc.description;
                  const hasGoogleDoc = !!(doc.url && extractDocId(doc.url));
                  const isPreviewing = previewDoc?.id === doc.id;

                  if (isEditing) return null; // Editing happens in the top form

                  return (
                    <div
                      key={doc.id}
                      className={`rounded-3xl border bg-white shadow-sm overflow-hidden transition ${
                        isPreviewing || isExpanded ? "border-zinc-400" : "border-zinc-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 p-5">
                        <div
                          className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer"
                          onClick={() => {
                            if (hasDescription) toggleExpand(doc.id);
                            else if (hasGoogleDoc) setPreviewDoc(isPreviewing ? null : doc);
                          }}
                        >
                          <FileText size={20} className="shrink-0 text-zinc-400" />
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">
                              {doc.title}
                            </h3>
                            <p className="mt-0.5 text-xs text-zinc-400">
                              {doc.category === "sop" ? t("SOP") : t("Crop guide")}
                              {hasDescription && hasGoogleDoc
                                ? t(" · Has description & Google Doc")
                                : hasDescription
                                ? t(" · Tap to view description")
                                : hasGoogleDoc
                                ? t(" · Tap to preview doc")
                                : t(" · No content yet")}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {hasDescription && (
                            <button
                              onClick={() => toggleExpand(doc.id)}
                              className="flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
                            >
                              {isExpanded ? t("Collapse") : t("View")}
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          )}
                          {hasGoogleDoc && (
                            <button
                              onClick={() => setPreviewDoc(isPreviewing ? null : doc)}
                              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                                isPreviewing
                                  ? "border-zinc-400 bg-zinc-100 text-zinc-900"
                                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                              }`}
                            >
                              {isPreviewing ? t("Hide Doc") : t("Doc")}
                            </button>
                          )}
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
                            >
                              {t("Open")} <ExternalLink size={12} />
                            </a>
                          )}
                          {isManager && (
                            <>
                              <button onClick={() => startEdit(doc)} className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100">{t("Edit")}</button>
                              <button onClick={() => handleDelete(doc.id)} disabled={deletingId === doc.id} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
                                {deletingId === doc.id ? "…" : t("Del")}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Inline description display */}
                      {isExpanded && hasDescription && (
                        <div className="border-t border-zinc-100 bg-stone-50 p-5">
                          <div
                            className="rounded-2xl bg-white border border-zinc-100 p-5 text-sm leading-relaxed whitespace-pre-wrap break-words"
                          >
                            {doc.description}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Google Doc Preview Pane (side panel) */}
          {previewDoc && previewUrl && (
            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{previewDoc.title}</h2>
                  <p className="text-xs text-zinc-400">{previewDoc.category === "sop" ? t("SOP") : t("Crop guide")}</p>
                </div>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
                >
                  {t("Close")}
                </button>
              </div>
              <iframe
                src={previewUrl}
                className="h-[70vh] w-full rounded-xl border border-zinc-200 bg-white"
                sandbox="allow-scripts allow-same-origin"
                title={previewDoc.title}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
