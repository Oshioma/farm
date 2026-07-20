"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { getSpaces } from "@/lib/community/spaces";
import { listMembers } from "@/lib/community/members";
import { getChallenges } from "@/lib/community/challenges";
import { Card } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

export default function AdminDashboardPage() {
  const { community } = useAdminContext();
  const [stats, setStats] = useState<{ spaces: number; members: number; challenges: number } | null>(null);

  useEffect(() => {
    Promise.all([getSpaces(community.id, { includeHidden: true }), listMembers(community.id), getChallenges(community.id)]).then(
      ([spaces, members, challenges]) => setStats({ spaces: spaces.length, members: members.length, challenges: challenges.length })
    );
  }, [community.id]);

  const base = `/community/${community.slug}/admin`;
  const tiles = [
    { label: "Spaces", value: stats?.spaces, icon: "layers", href: `${base}/spaces` },
    { label: "Members", value: stats?.members, icon: "users-round", href: `${base}/members` },
    { label: "Challenges", value: stats?.challenges, icon: "flag", href: `${base}/challenges` },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">{community.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {community.status === "launched" ? "Live" : "Draft"} · app.community/{community.slug}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="p-5 transition hover:border-zinc-400">
              <div className="flex items-center justify-between">
                <DynamicIcon name={t.icon} size={18} className="text-zinc-400" />
                <span className="text-2xl font-extrabold text-zinc-900">{t.value ?? "–"}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-zinc-600">{t.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-sm font-bold text-zinc-900">Quick links</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            { href: `${base}/spaces`, label: "Add or edit a Space", icon: "layers" },
            { href: `${base}/navigation`, label: "Rearrange navigation", icon: "menu" },
            { href: `${base}/journal-templates`, label: "Edit journal fields", icon: "notebook-pen" },
            { href: `${base}/settings`, label: "Community settings", icon: "settings" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-2.5 rounded-xl border border-zinc-200 px-3.5 py-3 text-sm font-medium text-zinc-700 hover:border-zinc-900">
              <DynamicIcon name={l.icon} size={16} />
              {l.label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
