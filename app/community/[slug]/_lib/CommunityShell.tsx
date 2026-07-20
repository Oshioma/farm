"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Community, CommunityMember, NavigationItem, Space } from "@/lib/community/types";
import { getNavigation } from "@/lib/community/navigation";
import { getSpaces } from "@/lib/community/spaces";
import { DynamicIcon } from "@/lib/community/icon";

export function CommunityShell({ community, membership, children }: { community: Community; membership: CommunityMember; children: React.ReactNode }) {
  const [nav, setNav] = useState<NavigationItem[]>([]);
  const [spacesById, setSpacesById] = useState<Record<string, Space>>({});
  const pathname = usePathname();

  useEffect(() => {
    Promise.all([getNavigation(community.id), getSpaces(community.id)]).then(([navItems, spaces]) => {
      setNav(navItems);
      setSpacesById(Object.fromEntries(spaces.map((s) => [s.id, s])));
    });
  }, [community.id]);

  const isAdmin = membership.role === "owner" || membership.role === "admin";
  const base = `/community/${community.slug}`;
  const isTop = community.nav_style === "top";
  const isGrouped = community.nav_style === "grouped_sidebar";

  const groups = nav.filter((n) => n.item_type === "group").sort((a, b) => a.sort_order - b.sort_order);
  const spaceItems = nav
    .filter((n) => n.item_type === "space" && n.space_id && spacesById[n.space_id])
    .sort((a, b) => a.sort_order - b.sort_order);

  function NavLink({ item }: { item: NavigationItem }) {
    const space = spacesById[item.space_id!];
    const href = `${base}/${space.slug}`;
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
          isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        }`}
      >
        <DynamicIcon name={item.icon ?? "circle"} size={16} />
        {item.label}
      </Link>
    );
  }

  const header = (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3.5">
      <Link href={base} className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
          {community.name.slice(0, 1).toUpperCase()}
        </div>
        <span className="text-sm font-bold text-zinc-900">{community.name}</span>
      </Link>
      {isAdmin && (
        <Link href={`${base}/admin`} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:border-zinc-900 hover:text-zinc-900">
          <DynamicIcon name="settings" size={13} />
          Admin
        </Link>
      )}
    </header>
  );

  if (isTop) {
    return (
      <div className="min-h-screen">
        {header}
        <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-6 py-2">
          {spaceItems.map((item) => (
            <NavLink key={item.id} item={item} />
          ))}
        </nav>
        <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white">
        {header}
        <nav className="flex-1 space-y-4 overflow-y-auto p-4">
          {isGrouped ? (
            <>
              {groups.map((g) => (
                <div key={g.id}>
                  <p className="px-2 text-[11px] font-bold uppercase tracking-wide text-zinc-400">{g.label}</p>
                  <div className="mt-1 space-y-0.5">
                    {spaceItems.filter((s) => s.parent_id === g.id).map((item) => (
                      <NavLink key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="space-y-0.5">
                {spaceItems.filter((s) => !s.parent_id).map((item) => (
                  <NavLink key={item.id} item={item} />
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-0.5">
              {spaceItems.map((item) => (
                <NavLink key={item.id} item={item} />
              ))}
            </div>
          )}
        </nav>
      </div>
      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
