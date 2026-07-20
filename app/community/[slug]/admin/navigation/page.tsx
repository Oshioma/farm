"use client";

import { useEffect, useState } from "react";
import { useAdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { getSpaces } from "@/lib/community/spaces";
import {
  createNavigationItem,
  deleteNavigationItem,
  getNavigation,
  reorderNavigationItems,
  setNavStyle,
} from "@/lib/community/navigation";
import type { NavigationItem, NavStyle, Space } from "@/lib/community/types";
import { Card } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

const NAV_STYLES: { value: NavStyle; collapsible: boolean; label: string; description: string; icon: string }[] = [
  { value: "sidebar", collapsible: false, label: "Sidebar", description: "A flat list of Spaces down the left side.", icon: "panel-left" },
  { value: "top", collapsible: false, label: "Top Navigation", description: "Spaces laid out across the top bar.", icon: "panel-top" },
  { value: "grouped_sidebar", collapsible: false, label: "Grouped Navigation", description: "Spaces organized into named groups.", icon: "folder-tree" },
  { value: "grouped_sidebar", collapsible: true, label: "Collapsible Sections", description: "Grouped sidebar where each section can collapse.", icon: "chevrons-down-up" },
];

export default function NavigationAdminPage() {
  const { community, refresh } = useAdminContext();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  async function load() {
    const [allSpaces, nav] = await Promise.all([getSpaces(community.id), getNavigation(community.id)]);
    setSpaces(allSpaces);

    const missing = allSpaces.filter((s) => !nav.some((n) => n.space_id === s.id));
    if (missing.length) {
      await Promise.all(
        missing.map((s, i) =>
          createNavigationItem({
            community_id: community.id,
            space_id: s.id,
            parent_id: null,
            item_type: "space",
            label: s.name,
            icon: s.icon,
            url: null,
            sort_order: nav.length + i,
            is_collapsible: false,
          })
        )
      );
      setItems(await getNavigation(community.id));
    } else {
      setItems(nav);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id]);

  const isGrouped = community.nav_style === "grouped_sidebar";
  const spaceItems = items.filter((i) => i.item_type === "space").sort((a, b) => a.sort_order - b.sort_order);
  const groups = items.filter((i) => i.item_type === "group");

  async function handleStyleChange(style: NavStyle, collapsible: boolean) {
    await setNavStyle(community.id, style, collapsible);
    refresh();
  }

  async function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const copy = [...spaceItems];
    const [moved] = copy.splice(dragIndex, 1);
    copy.splice(targetIndex, 0, moved);
    setItems([...groups, ...copy]);
    setDragIndex(null);
    await reorderNavigationItems(copy.map((it, i) => ({ id: it.id, sort_order: i })));
  }

  async function assignGroup(item: NavigationItem, label: string) {
    if (!label) {
      await reorderNavigationItems([{ id: item.id, sort_order: item.sort_order, parent_id: null }]);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, parent_id: null } : i)));
      return;
    }
    let group = groups.find((g) => g.label === label);
    if (!group) {
      group = await createNavigationItem({
        community_id: community.id,
        space_id: null,
        parent_id: null,
        item_type: "group",
        label,
        icon: null,
        url: null,
        sort_order: groups.length,
        is_collapsible: true,
      });
      setItems((prev) => [...prev, group!]);
    }
    await reorderNavigationItems([{ id: item.id, sort_order: item.sort_order, parent_id: group.id }]);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, parent_id: group!.id } : i)));
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Navigation</h1>
      <p className="mt-1 text-sm text-zinc-500">Drag to reorder Spaces, and choose how members navigate your community.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {NAV_STYLES.map((opt) => {
          const isActive = community.nav_style === opt.value && community.nav_collapsible === opt.collapsible;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => handleStyleChange(opt.value, opt.collapsible)}
              className={`rounded-2xl border-2 p-4 text-left transition ${isActive ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-300"}`}
            >
              <DynamicIcon name={opt.icon} size={18} className="text-zinc-700" />
              <p className="mt-2 text-sm font-bold text-zinc-900">{opt.label}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{opt.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-2">
        {spaceItems.map((item, i) => {
          const space = spaces.find((s) => s.id === item.space_id);
          const group = groups.find((g) => g.id === item.parent_id);
          return (
            <Card
              key={item.id}
              className={`flex items-center gap-3 px-3.5 py-2.5 ${dragIndex === i ? "border-zinc-900 shadow" : ""}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => setDragIndex(null)}
            >
              <DynamicIcon name="grip-vertical" size={14} className="shrink-0 cursor-grab text-zinc-300" />
              <DynamicIcon name={item.icon ?? "circle"} size={16} className="shrink-0 text-zinc-600" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">{item.label}</span>
              {isGrouped && (
                <input
                  list="nav-groups"
                  defaultValue={group?.label ?? ""}
                  onBlur={(e) => assignGroup(item, e.target.value)}
                  placeholder="No group"
                  className="w-40 rounded-lg border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-900"
                />
              )}
              {space?.is_hidden && (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteNavigationItem(item.id);
                    setItems((prev) => prev.filter((i) => i.id !== item.id));
                  }}
                  className="text-zinc-300 hover:text-red-600"
                  title="Remove from navigation"
                >
                  <DynamicIcon name="x" size={14} />
                </button>
              )}
            </Card>
          );
        })}
        {isGrouped && (
          <datalist id="nav-groups">
            {groups.map((g) => (
              <option key={g.id} value={g.label} />
            ))}
          </datalist>
        )}
      </div>
    </div>
  );
}
