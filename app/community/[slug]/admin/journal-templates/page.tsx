"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { getSpaces } from "@/lib/community/spaces";
import type { Space } from "@/lib/community/types";
import { Card, EmptyState } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

export default function JournalTemplatesPage() {
  const { community } = useAdminContext();
  const [spaces, setSpaces] = useState<Space[] | null>(null);

  useEffect(() => {
    getSpaces(community.id, { includeHidden: true }).then((all) => setSpaces(all.filter((s) => s.space_type === "journal")));
  }, [community.id]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Journal Templates</h1>
      <p className="mt-1 text-sm text-zinc-500">Every Journal Space has its own set of fields members fill in for each entry.</p>

      <div className="mt-6 space-y-3">
        {spaces === null ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : spaces.length === 0 ? (
          <EmptyState icon="notebook-pen" title="No Journal spaces yet" description="Add a Journal-type Space to define what members document." />
        ) : (
          spaces.map((s) => (
            <Link key={s.id} href={`/community/${community.slug}/admin/spaces/${s.id}/journal`}>
              <Card className="flex items-center gap-3 p-4 transition hover:border-zinc-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                  <DynamicIcon name={s.icon} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900">{s.name}</p>
                  <p className="text-xs text-zinc-500">{s.description}</p>
                </div>
                <DynamicIcon name="chevron-right" size={16} className="text-zinc-300" />
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
