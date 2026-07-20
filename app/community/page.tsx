"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listMyCommunities } from "@/lib/community/communities";
import type { Community, CommunityMember } from "@/lib/community/types";
import { Button, Card, EmptyState, Pill } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";
import { getCommunityTemplate } from "@/lib/community/catalog/communityTemplates";

type MyCommunity = Community & { my_role: CommunityMember["role"] };

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<MyCommunity[] | null>(null);

  useEffect(() => {
    listMyCommunities()
      .then(setCommunities)
      .catch(() => setCommunities([]));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Your Communities</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Communities you own or belong to.</p>
        </div>
        <Link href="/community/new">
          <Button>
            <DynamicIcon name="plus" size={16} />
            Create Community
          </Button>
        </Link>
      </div>

      <div className="mt-8">
        {communities === null ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : communities.length === 0 ? (
          <EmptyState
            icon="sparkles"
            title="No communities yet"
            description="Create your first community and we'll help you build the perfect setup with an intelligent wizard."
            action={
              <Link href="/community/new">
                <Button>
                  <DynamicIcon name="plus" size={16} />
                  Create Community
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((c) => {
              const template = getCommunityTemplate(c.template_key);
              return (
                <Link key={c.id} href={`/community/${c.slug}`}>
                  <Card className="h-full p-5 transition hover:border-zinc-400">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white">
                      <DynamicIcon name={template?.icon ?? "sparkles"} size={20} />
                    </div>
                    <h3 className="mt-3 text-base font-bold text-zinc-900">{c.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{c.description || "No description yet."}</p>
                    <div className="mt-4 flex gap-2">
                      <Pill tone={c.status === "launched" ? "emerald" : "amber"}>{c.status}</Pill>
                      <Pill>{c.my_role}</Pill>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
