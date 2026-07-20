"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { createSpace, deleteSpace, duplicateSpace, getSpaces, reorderSpaces, updateSpace } from "@/lib/community/spaces";
import type { Space } from "@/lib/community/types";
import { SPACE_TYPE_CATALOG, SPACE_TYPE_LIST } from "@/lib/community/catalog/spaceTypes";
import { Button, Card, Pill } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

export default function SpacesAdminPage() {
  const { community } = useAdminContext();
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    getSpaces(community.id, { includeHidden: true }).then(setSpaces);
  }, [community.id]);

  function patchLocal(id: string, patch: Partial<Space>) {
    setSpaces((prev) => prev?.map((s) => (s.id === id ? { ...s, ...patch } : s)) ?? null);
  }

  async function handleAdd(name: string, spaceType: Space["space_type"]) {
    const created = await createSpace(community.id, { name, space_type: spaceType });
    setSpaces((prev) => [...(prev ?? []), created]);
    setShowPicker(false);
  }

  async function handleRename(space: Space, name: string) {
    patchLocal(space.id, { name });
    await updateSpace(space.id, { name });
  }

  async function handleToggleHidden(space: Space) {
    const is_hidden = !space.is_hidden;
    patchLocal(space.id, { is_hidden });
    await updateSpace(space.id, { is_hidden });
  }

  async function handleDuplicate(space: Space) {
    const copy = await duplicateSpace(space);
    setSpaces((prev) => [...(prev ?? []), copy]);
  }

  async function handleDelete(space: Space) {
    if (!confirm(`Delete "${space.name}"? This removes all its content.`)) return;
    setSpaces((prev) => prev?.filter((s) => s.id !== space.id) ?? null);
    await deleteSpace(space.id);
  }

  async function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex || !spaces) return;
    const copy = [...spaces];
    const [moved] = copy.splice(dragIndex, 1);
    copy.splice(targetIndex, 0, moved);
    setSpaces(copy);
    setDragIndex(null);
    await reorderSpaces(copy.map((s, i) => ({ id: s.id, sort_order: i })));
  }

  if (!spaces) return <p className="text-sm text-zinc-400">Loading…</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Spaces</h1>
      <p className="mt-1 text-sm text-zinc-500">Every feature in your community is a Space. Add, edit, reorder or hide them here.</p>

      <div className="mt-6 space-y-3">
        {spaces.map((space, i) => {
          const meta = SPACE_TYPE_CATALOG[space.space_type];
          return (
            <Card
              key={space.id}
              className={`p-4 transition ${space.is_hidden ? "opacity-50" : ""} ${dragIndex === i ? "border-zinc-900 shadow-lg" : ""}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => setDragIndex(null)}
            >
              <div className="flex items-start gap-3">
                <DynamicIcon name="grip-vertical" size={16} className="mt-2.5 shrink-0 cursor-grab text-zinc-300" />
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                  <DynamicIcon name={space.icon} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  {editingId === space.id ? (
                    <input
                      autoFocus
                      defaultValue={space.name}
                      onBlur={(e) => {
                        handleRename(space, e.target.value);
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      className="rounded-lg border border-zinc-300 px-2 py-1 text-sm font-bold outline-none"
                    />
                  ) : (
                    <button type="button" onClick={() => setEditingId(space.id)} className="text-sm font-bold text-zinc-900 hover:underline">
                      {space.name}
                    </button>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <Pill>{meta.label}</Pill>
                    {space.is_hidden && <Pill tone="amber">Hidden</Pill>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {space.space_type === "journal" && (
                    <Link href={`/community/${community.slug}/admin/spaces/${space.id}/journal`} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900" title="Journal fields">
                      <DynamicIcon name="notebook-pen" size={16} />
                    </Link>
                  )}
                  <button type="button" onClick={() => setEditingId(space.id)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900" title="Rename">
                    <DynamicIcon name="pencil" size={16} />
                  </button>
                  <button type="button" onClick={() => handleDuplicate(space)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900" title="Duplicate">
                    <DynamicIcon name="copy" size={16} />
                  </button>
                  <button type="button" onClick={() => handleToggleHidden(space)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900" title={space.is_hidden ? "Show" : "Hide"}>
                    <DynamicIcon name={space.is_hidden ? "eye-off" : "eye"} size={16} />
                  </button>
                  <button type="button" onClick={() => handleDelete(space)} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                    <DynamicIcon name="trash-2" size={16} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showPicker ? (
        <Card className="mt-4 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-800">Choose a Space type</span>
            <button type="button" onClick={() => setShowPicker(false)} className="text-zinc-400 hover:text-zinc-900">
              <DynamicIcon name="x" size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SPACE_TYPE_LIST.map((t) => (
              <button key={t.type} type="button" onClick={() => handleAdd(t.label, t.type)} className="flex items-start gap-2.5 rounded-xl border border-zinc-200 p-3 text-left hover:border-zinc-900">
                <DynamicIcon name={t.icon} size={16} className="mt-0.5 shrink-0 text-zinc-700" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900">{t.label}</p>
                  <p className="truncate text-[11px] text-zinc-500">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Button variant="secondary" className="mt-4" onClick={() => setShowPicker(true)}>
          <DynamicIcon name="plus" size={16} />
          Add Space
        </Button>
      )}
    </div>
  );
}
