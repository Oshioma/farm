"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCommunityBySlug } from "@/lib/community/communities";
import { getMyMembership } from "@/lib/community/members";
import type { Community, CommunityMember } from "@/lib/community/types";
import { AdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { AdminShell } from "@/app/community/[slug]/admin/_lib/AdminShell";
import { Button } from "@/app/community/_ui/primitives";

export default function CommunityAdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [community, setCommunity] = useState<Community | null | undefined>(undefined);
  const [membership, setMembership] = useState<CommunityMember | null | undefined>(undefined);

  const load = useCallback(() => {
    getCommunityBySlug(slug)
      .then(async (c) => {
        setCommunity(c);
        if (c) setMembership(await getMyMembership(c.id));
        else setMembership(null);
      })
      .catch(() => {
        setCommunity(null);
        setMembership(null);
      });
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

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

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-bold text-zinc-900">You don&apos;t have admin access to {community.name}</p>
        <Link href={`/community/${community.slug}`}>
          <Button variant="secondary">View Community</Button>
        </Link>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ community, membership, refresh: load }}>
      <AdminShell community={community}>{children}</AdminShell>
    </AdminContext.Provider>
  );
}
