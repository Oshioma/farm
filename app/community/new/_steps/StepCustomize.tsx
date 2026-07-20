"use client";

import { useState } from "react";
import type { WizardState } from "@/app/community/new/_lib/state";
import { addSpace, reorder } from "@/app/community/new/_lib/state";
import type { WizardSpaceInput } from "@/lib/community/wizardTypes";
import { SPACE_TYPE_LIST } from "@/lib/community/catalog/spaceTypes";
import { SpaceEditorCard } from "@/app/community/new/_steps/SpaceEditorCard";
import { Button, Card } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

export function StepCustomize({ state, update }: { state: WizardState; update: (patch: Partial<WizardState>) => void }) {
  const [showPicker, setShowPicker] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function patchSpace(tempId: string, patch: Partial<WizardSpaceInput>) {
    update({ spaces: state.spaces.map((s) => (s.tempId === tempId ? { ...s, ...patch } : s)) });
  }

  function duplicateSpace(space: WizardSpaceInput) {
    const copy: WizardSpaceInput = { ...space, tempId: `${space.tempId}-copy-${Date.now()}`, name: `${space.name} (Copy)`, slug: `${space.slug}-copy-${Date.now() % 10000}` };
    const index = state.spaces.findIndex((s) => s.tempId === space.tempId);
    const next = [...state.spaces];
    next.splice(index + 1, 0, copy);
    update({ spaces: next });
  }

  function deleteSpace(tempId: string) {
    update({ spaces: state.spaces.filter((s) => s.tempId !== tempId) });
  }

  function handleAddSpace(name: string, type: (typeof SPACE_TYPE_LIST)[number]) {
    update({ spaces: [...state.spaces, addSpace(state, name, type.type, type.icon)] });
    setShowPicker(false);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    update({ spaces: reorder(state.spaces, dragIndex, targetIndex) });
    setDragIndex(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Customize your setup</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Rename, duplicate, hide, delete or reorder any Space. Drag the handle to reorder.</p>
      </div>

      <div className="space-y-3">
        {state.spaces.map((space, i) => (
          <SpaceEditorCard
            key={space.tempId}
            space={space}
            onChange={(patch) => patchSpace(space.tempId, patch)}
            onDuplicate={() => duplicateSpace(space)}
            onDelete={() => deleteSpace(space.tempId)}
            isDragging={dragIndex === i}
            dragHandlers={{
              draggable: true,
              onDragStart: () => setDragIndex(i),
              onDragOver: (e) => e.preventDefault(),
              onDrop: () => handleDrop(i),
              onDragEnd: () => setDragIndex(null),
            }}
          />
        ))}
      </div>

      {state.spaces.length === 0 && (
        <Card className="p-10 text-center text-sm text-zinc-400">No spaces yet — add your first one below.</Card>
      )}

      {showPicker ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-800">Choose a Space type</span>
            <button type="button" onClick={() => setShowPicker(false)} className="text-zinc-400 hover:text-zinc-900">
              <DynamicIcon name="x" size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {SPACE_TYPE_LIST.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => handleAddSpace(t.label, t)}
                className="flex items-start gap-2.5 rounded-xl border border-zinc-200 p-3 text-left hover:border-zinc-900"
              >
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
        <Button variant="secondary" onClick={() => setShowPicker(true)}>
          <DynamicIcon name="plus" size={16} />
          Add Space
        </Button>
      )}
    </div>
  );
}
