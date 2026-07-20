"use client";

import { useState, type DragEventHandler } from "react";
import type { WizardSpaceInput } from "@/lib/community/wizardTypes";
import { SPACE_TYPE_CATALOG } from "@/lib/community/catalog/spaceTypes";
import { DynamicIcon } from "@/lib/community/icon";
import { Card, Pill } from "@/app/community/_ui/primitives";
import { JournalFieldBuilder } from "@/app/community/new/_steps/JournalFieldBuilder";

export function SpaceEditorCard({
  space,
  onChange,
  onDuplicate,
  onDelete,
  dragHandlers,
  isDragging,
}: {
  space: WizardSpaceInput;
  onChange: (patch: Partial<WizardSpaceInput>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  dragHandlers: {
    draggable: boolean;
    onDragStart: DragEventHandler;
    onDragOver: DragEventHandler;
    onDrop: DragEventHandler;
    onDragEnd: DragEventHandler;
  };
  isDragging: boolean;
}) {
  const [editingName, setEditingName] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const meta = SPACE_TYPE_CATALOG[space.space_type];

  return (
    <Card
      className={`p-4 transition ${space.is_hidden ? "opacity-50" : ""} ${isDragging ? "border-zinc-900 shadow-lg" : ""}`}
      {...dragHandlers}
    >
      <div className="flex items-start gap-3">
        <button type="button" className="mt-1 cursor-grab text-zinc-300 hover:text-zinc-500 active:cursor-grabbing">
          <DynamicIcon name="grip-vertical" size={16} />
        </button>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
          <DynamicIcon name={space.icon} size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {editingName ? (
              <input
                autoFocus
                value={space.name}
                onChange={(e) => onChange({ name: e.target.value })}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                className="rounded-lg border border-zinc-300 px-2 py-1 text-sm font-bold outline-none"
              />
            ) : (
              <button type="button" onClick={() => setEditingName(true)} className="text-sm font-bold text-zinc-900 hover:underline">
                {space.name}
              </button>
            )}
            <Pill>{meta.label}</Pill>
            {space.is_hidden && <Pill tone="amber">Hidden</Pill>}
          </div>
          <input
            value={space.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Add a short description…"
            className="mt-1 w-full bg-transparent text-xs text-zinc-500 outline-none placeholder:text-zinc-400"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {space.space_type === "journal" && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
              title="Edit journal fields"
            >
              <DynamicIcon name={expanded ? "chevron-up" : "notebook-pen"} size={16} />
            </button>
          )}
          <button type="button" onClick={() => setEditingName(true)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900" title="Rename">
            <DynamicIcon name="pencil" size={16} />
          </button>
          <button type="button" onClick={onDuplicate} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900" title="Duplicate">
            <DynamicIcon name="copy" size={16} />
          </button>
          <button
            type="button"
            onClick={() => onChange({ is_hidden: !space.is_hidden })}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
            title={space.is_hidden ? "Show" : "Hide"}
          >
            <DynamicIcon name={space.is_hidden ? "eye-off" : "eye"} size={16} />
          </button>
          <button type="button" onClick={onDelete} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600" title="Delete">
            <DynamicIcon name="trash-2" size={16} />
          </button>
        </div>
      </div>

      {space.space_type === "journal" && expanded && <JournalFieldBuilder space={space} onChange={onChange} />}
    </Card>
  );
}
