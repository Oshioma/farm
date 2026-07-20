"use client";

import { createContext, useContext } from "react";
import type { Community, CommunityMember } from "@/lib/community/types";

export interface CommunityContextValue {
  community: Community;
  membership: CommunityMember;
  refresh: () => void;
}

export const CommunityContext = createContext<CommunityContextValue | null>(null);

export function useCommunityContext(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunityContext must be used within the community layout");
  return ctx;
}
