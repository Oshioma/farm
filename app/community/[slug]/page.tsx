"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCommunityContext } from "@/app/community/[slug]/_lib/CommunityContext";
import { getSpaces } from "@/lib/community/spaces";
import { getCommunityTimeline } from "@/lib/community/timeline";
import type { MemberTimelineEvent, Space } from "@/lib/community/types";
import { Card, EmptyState } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

export default function CommunityHomePage() {
  const { community } = useCommunityContext();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [timeline, setTimeline] = useState<MemberTimelineEvent[]>([]);

  useEffect(() => {
    getSpaces(community.id).then(setSpaces);
    getCommunityTimeline(community.id, 10).then(setTimeline);
  }, [community.id]);

  return (
    <div className="max-w-4xl">
      {community.banner_url && (
        <div className="mb-6 h-40 overflow-hidden rounded-2xl bg-zinc-100">
          <img src={community.banner_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">{community.name}</h1>
      {community.description && <p className="mt-1.5 max-w-xl text-sm text-zinc-500">{community.description}</p>}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {spaces.map((s) => (
          <Link key={s.id} href={`/community/${community.slug}/${s.slug}`}>
            <Card className="flex items-center gap-2.5 p-3.5 transition hover:border-zinc-400">
              <DynamicIcon name={s.icon} size={16} className="shrink-0 text-zinc-600" />
              <span className="truncate text-sm font-semibold text-zinc-900">{s.name}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Recent Activity</h2>
        <div className="mt-3 space-y-2">
          {timeline.length === 0 ? (
            <EmptyState icon="sparkles" title="Nothing yet" description="Activity across the community will show up here." />
          ) : (
            timeline.map((e) => (
              <Card key={e.id} className="flex items-center gap-3 p-3.5">
                <DynamicIcon name="sparkles" size={15} className="shrink-0 text-zinc-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{e.title}</p>
                  {e.summary && <p className="truncate text-xs text-zinc-500">{e.summary}</p>}
                </div>
                <span className="shrink-0 text-xs text-zinc-400">{new Date(e.occurred_at).toLocaleDateString()}</span>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
