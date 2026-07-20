"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { getSpaces } from "@/lib/community/spaces";
import type { Space, SpaceType } from "@/lib/community/types";
import { Button, Card, EmptyState, Pill } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

// Events / Marketplace / Courses aren't separate subsystems — they're just
// Spaces of a given type. This view keeps the admin sidebar's promise
// ("Events", "Marketplace", "Courses") without duplicating the Space Builder.
export function SpaceTypeFilterView({
  spaceTypes,
  title,
  description,
  emptyIcon,
}: {
  spaceTypes: SpaceType[];
  title: string;
  description: string;
  emptyIcon: string;
}) {
  const { community } = useAdminContext();
  const [spaces, setSpaces] = useState<Space[] | null>(null);

  useEffect(() => {
    getSpaces(community.id, { includeHidden: true }).then((all) => setSpaces(all.filter((s) => spaceTypes.includes(s.space_type))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id]);

  const spacesHref = `/community/${community.slug}/admin/spaces`;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">{title}</h1>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>

      <div className="mt-6 space-y-3">
        {spaces === null ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : spaces.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={`No ${title} Space yet`}
            description={`Add a ${title} Space from the Space Builder to get started.`}
            action={
              <Link href={spacesHref}>
                <Button>Open Space Builder</Button>
              </Link>
            }
          />
        ) : (
          spaces.map((s) => (
            <Link key={s.id} href={spacesHref}>
              <Card className="flex items-center gap-3 p-4 transition hover:border-zinc-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                  <DynamicIcon name={s.icon} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900">{s.name}</p>
                  <p className="text-xs text-zinc-500">{s.description}</p>
                </div>
                {s.is_hidden && <Pill tone="amber">Hidden</Pill>}
                <DynamicIcon name="chevron-right" size={16} className="text-zinc-300" />
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
