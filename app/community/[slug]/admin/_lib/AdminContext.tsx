"use client";

import { createContext, useContext } from "react";
import type { Community, CommunityMember } from "@/lib/community/types";

export interface AdminContextValue {
  community: Community;
  membership: CommunityMember;
  refresh: () => void;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdminContext(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminContext must be used within the community admin layout");
  return ctx;
}
