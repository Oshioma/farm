"use client";

import { useState } from "react";
import type { WizardState } from "@/app/community/new/_lib/state";
import { reorder } from "@/app/community/new/_lib/state";
import { Card } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";
import type { NavStyle } from "@/lib/community/types";

const NAV_STYLES: { value: NavStyle; collapsible: boolean; label: string; description: string; icon: string }[] = [
  { value: "sidebar", collapsible: false, label: "Sidebar", description: "A flat list of Spaces down the left side.", icon: "panel-left" },
  { value: "top", collapsible: false, label: "Top Navigation", description: "Spaces laid out across the top bar.", icon: "panel-top" },
  { value: "grouped_sidebar", collapsible: false, label: "Grouped Navigation", description: "Spaces organized into named groups.", icon: "folder-tree" },
  { value: "grouped_sidebar", collapsible: true, label: "Collapsible Sections", description: "Grouped sidebar where each section can collapse.", icon: "chevrons-down-up" },
];

export function StepNavigation({ state, update }: { state: WizardState; update: (patch: Partial<WizardState>) => void }) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const visible = state.spaces.filter((s) => !s.is_hidden);
  const groups = Array.from(new Set(visible.map((s) => s.group_label).filter((g): g is string => !!g)));
  const isGrouped = state.navStyle === "grouped_sidebar";

  function setGroup(tempId: string, group: string | null) {
    update({ spaces: state.spaces.map((s) => (s.tempId === tempId ? { ...s, group_label: group } : s)) });
  }

  function handleDrop(targetTempId: string) {
    if (dragIndex === null) return;
    const fromIndex = state.spaces.findIndex((s) => s.tempId === visible[dragIndex].tempId);
    const toIndex = state.spaces.findIndex((s) => s.tempId === targetTempId);
    if (fromIndex === -1 || toIndex === -1) return;
    update({ spaces: reorder(state.spaces, fromIndex, toIndex) });
    setDragIndex(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Choose navigation</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Drag Spaces to reorder them, and group related Spaces together.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {NAV_STYLES.map((opt) => {
          const isActive = state.navStyle === opt.value && state.navCollapsible === opt.collapsible;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => update({ navStyle: opt.value, navCollapsible: opt.collapsible })}
              className={`rounded-2xl border-2 p-4 text-left transition ${isActive ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-300"}`}
            >
              <DynamicIcon name={opt.icon} size={18} className="text-zinc-700" />
              <p className="mt-2 text-sm font-bold text-zinc-900">{opt.label}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{opt.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-2">
          {visible.map((space, i) => (
            <div
              key={space.tempId}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(space.tempId)}
              onDragEnd={() => setDragIndex(null)}
              className={`flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 ${dragIndex === i ? "border-zinc-900 shadow" : ""}`}
            >
              <DynamicIcon name="grip-vertical" size={14} className="shrink-0 cursor-grab text-zinc-300" />
              <DynamicIcon name={space.icon} size={16} className="shrink-0 text-zinc-600" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">{space.name}</span>
              {isGrouped && (
                <input
                  list="nav-groups"
                  value={space.group_label ?? ""}
                  onChange={(e) => setGroup(space.tempId, e.target.value || null)}
                  placeholder="No group"
                  className="w-36 rounded-lg border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-900"
                />
              )}
            </div>
          ))}
          {isGrouped && (
            <datalist id="nav-groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          )}
        </div>

        <Card className="h-fit p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Preview</p>
          <NavPreview visible={visible} isGrouped={isGrouped} groups={groups} />
        </Card>
      </div>
    </div>
  );
}

function NavPreview({
  visible,
  isGrouped,
  groups,
}: {
  visible: WizardState["spaces"];
  isGrouped: boolean;
  groups: string[];
}) {
  if (!isGrouped) {
    return (
      <div className="space-y-1">
        {visible.map((s) => (
          <div key={s.tempId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-700">
            <DynamicIcon name={s.icon} size={13} />
            {s.name}
          </div>
        ))}
      </div>
    );
  }

  const ungrouped = visible.filter((s) => !s.group_label);
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g}>
          <p className="px-2 text-[11px] font-bold uppercase tracking-wide text-zinc-400">{g}</p>
          <div className="mt-1 space-y-1">
            {visible
              .filter((s) => s.group_label === g)
              .map((s) => (
                <div key={s.tempId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-700">
                  <DynamicIcon name={s.icon} size={13} />
                  {s.name}
                </div>
              ))}
          </div>
        </div>
      ))}
      {ungrouped.length > 0 && (
        <div className="space-y-1">
          {ungrouped.map((s) => (
            <div key={s.tempId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-700">
              <DynamicIcon name={s.icon} size={13} />
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
