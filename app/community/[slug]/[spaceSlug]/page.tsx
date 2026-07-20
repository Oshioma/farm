"use client";

import { use, useEffect, useState } from "react";
import { useCommunityContext } from "@/app/community/[slug]/_lib/CommunityContext";
import { getSpaceBySlug } from "@/lib/community/spaces";
import type { Space } from "@/lib/community/types";
import { DynamicIcon } from "@/lib/community/icon";
import { PostsView } from "@/app/community/[slug]/[spaceSlug]/_views/PostsView";
import { JournalView } from "@/app/community/[slug]/[spaceSlug]/_views/JournalView";
import { DirectoryView } from "@/app/community/[slug]/[spaceSlug]/_views/DirectoryView";
import { GrowthJourneyView } from "@/app/community/[slug]/[spaceSlug]/_views/GrowthJourneyView";
import { ChallengesView } from "@/app/community/[slug]/[spaceSlug]/_views/ChallengesView";
import { LeaderboardView } from "@/app/community/[slug]/[spaceSlug]/_views/LeaderboardView";

export default function SpacePage({ params }: { params: Promise<{ slug: string; spaceSlug: string }> }) {
  const { spaceSlug } = use(params);
  const { community, membership } = useCommunityContext();
  const [space, setSpace] = useState<Space | null | undefined>(undefined);

  useEffect(() => {
    setSpace(undefined);
    getSpaceBySlug(community.id, spaceSlug).then(setSpace);
  }, [community.id, spaceSlug]);

  if (space === undefined) return <p className="text-sm text-zinc-400">Loading…</p>;
  if (!space) return <p className="text-sm text-zinc-400">Space not found.</p>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
          <DynamicIcon name={space.icon} size={18} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">{space.name}</h1>
          {space.description && <p className="text-sm text-zinc-500">{space.description}</p>}
        </div>
      </div>

      <SpaceContent space={space} memberId={membership.id} communityId={community.id} />
    </div>
  );
}

function SpaceContent({ space, memberId, communityId }: { space: Space; memberId: string; communityId: string }) {
  switch (space.space_type) {
    case "journal":
      return <JournalView space={space} memberId={memberId} communityId={communityId} />;
    case "directory":
      return <DirectoryView communityId={communityId} />;
    case "growth_journey":
      return <GrowthJourneyView communityId={communityId} memberId={memberId} />;
    case "challenges":
      return <ChallengesView space={space} memberId={memberId} communityId={communityId} />;
    case "leaderboard":
      return <LeaderboardView communityId={communityId} />;
    default:
      return <PostsView space={space} memberId={memberId} communityId={communityId} />;
  }
}
