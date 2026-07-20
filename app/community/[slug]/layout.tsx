"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCommunityBySlug } from "@/lib/community/communities";
import { getMyMembership, joinCommunity, requestToJoin } from "@/lib/community/members";
import type { Community, CommunityMember } from "@/lib/community/types";
import { CommunityContext } from "@/app/community/[slug]/_lib/CommunityContext";
import { CommunityShell } from "@/app/community/[slug]/_lib/CommunityShell";
import { Button, Card } from "@/app/community/_ui/primitives";

export default function CommunityLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const pathname = usePathname();
  const [community, setCommunity] = useState<Community | null | undefined>(undefined);
  const [membership, setMembership] = useState<CommunityMember | null | undefined>(undefined);
  const [joining, setJoining] = useState(false);

  const load = useCallback(() => {
    getCommunityBySlug(slug).then(async (c) => {
      setCommunity(c);
      if (!c) {
        setMembership(null);
        return;
      }
      const existing = await getMyMembership(c.id);
      if (!existing && c.privacy === "public") {
        const created = await joinCommunity(c.id);
        setMembership(created);
      } else {
        setMembership(existing);
      }
    });
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRequestJoin() {
    if (!community) return;
    setJoining(true);
    const m = await requestToJoin(community.id);
    setMembership(m);
    setJoining(false);
  }

  // /admin has its own auth guard and shell (owner/admin only) — this layout's
  // membership gating and member-facing chrome would otherwise double-wrap it.
  if (pathname?.includes("/admin")) {
    return <>{children}</>;
  }

  if (community === undefined || membership === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-zinc-400">Loading…</div>;
  }

  if (!community) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-bold text-zinc-900">Community not found</p>
        <Link href="/community">
          <Button variant="secondary">Back to Communities</Button>
        </Link>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="max-w-sm p-8 text-center">
          <h1 className="text-lg font-bold text-zinc-900">{community.name}</h1>
          <p className="mt-1.5 text-sm text-zinc-500">{community.description || "This community is invite-only."}</p>
          <Button className="mt-5" onClick={handleRequestJoin} disabled={joining}>
            {joining ? "Requesting…" : "Request to Join"}
          </Button>
        </Card>
      </div>
    );
  }

  if (membership.status === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="max-w-sm p-8 text-center">
          <h1 className="text-lg font-bold text-zinc-900">Request pending</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Your request to join {community.name} is waiting on admin approval.</p>
        </Card>
      </div>
    );
  }

  if (membership.status === "banned") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="max-w-sm p-8 text-center">
          <h1 className="text-lg font-bold text-zinc-900">Access restricted</h1>
          <p className="mt-1.5 text-sm text-zinc-500">You no longer have access to {community.name}.</p>
        </Card>
      </div>
    );
  }

  return (
    <CommunityContext.Provider value={{ community, membership, refresh: load }}>
      <CommunityShell community={community} membership={membership}>
        {children}
      </CommunityShell>
    </CommunityContext.Provider>
  );
}
