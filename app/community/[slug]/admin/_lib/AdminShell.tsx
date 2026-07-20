"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DynamicIcon } from "@/lib/community/icon";
import type { Community } from "@/lib/community/types";

const NAV_SECTIONS: { label: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    label: "Overview",
    items: [{ href: "", label: "Dashboard", icon: "layout-dashboard" }],
  },
  {
    label: "Build",
    items: [
      { href: "/spaces", label: "Spaces", icon: "layers" },
      { href: "/navigation", label: "Navigation", icon: "menu" },
      { href: "/journal-templates", label: "Journal Templates", icon: "notebook-pen" },
      { href: "/profile-fields", label: "Profile Fields", icon: "id-card" },
      { href: "/directory", label: "Directory", icon: "users" },
    ],
  },
  {
    label: "Engage",
    items: [
      { href: "/members", label: "Members", icon: "users-round" },
      { href: "/challenges", label: "Challenges", icon: "flag" },
      { href: "/events", label: "Events", icon: "calendar-days" },
      { href: "/marketplace", label: "Marketplace", icon: "store" },
      { href: "/courses", label: "Courses", icon: "graduation-cap" },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/automations", label: "Automations", icon: "workflow" },
      { href: "/analytics", label: "Analytics", icon: "bar-chart-3" },
    ],
  },
  {
    label: "",
    items: [{ href: "/settings", label: "Settings", icon: "settings" }],
  },
];

export function AdminShell({ community, children }: { community: Community; children: React.ReactNode }) {
  const pathname = usePathname();
  const base = `/community/${community.slug}/admin`;

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-zinc-200 bg-white px-4 py-6">
        <Link href={`/community/${community.slug}`} className="flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
            {community.name.slice(0, 1).toUpperCase()}
          </div>
          <span className="truncate text-sm font-bold text-zinc-900">{community.name}</span>
        </Link>

        <nav className="mt-6 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label || section.items[0].href}>
              {section.label && <p className="px-2 text-[11px] font-bold uppercase tracking-wide text-zinc-400">{section.label}</p>}
              <div className="mt-1.5 space-y-0.5">
                {section.items.map((item) => {
                  const href = `${base}${item.href}`;
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                        isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      }`}
                    >
                      <DynamicIcon name={item.icon} size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 bg-zinc-50 px-8 py-8">{children}</main>
    </div>
  );
}
