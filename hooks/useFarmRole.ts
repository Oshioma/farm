"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Roles that can manage a farm (financials, admin, structure, deletes).
// "owner" is the farm creator; "manager" is reserved for a future non-owner
// manager role. Everyone else (e.g. "worker") is operational-only.
const MANAGER_ROLES = ["owner", "manager"];

export type FarmRoleState = {
  role: string | null;
  isManager: boolean;
  loading: boolean;
};

/**
 * Returns the signed-in user's role on the given farm and whether they may
 * manage it. While loading, `isManager` is false so manager-only UI stays
 * hidden until we positively confirm the role (fail closed).
 */
export function useFarmRole(farmId: string | null | undefined): FarmRoleState {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) {
      setRole(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setRole(null);
            setLoading(false);
          }
          return;
        }
        const { data } = await supabase
          .from("farm_members")
          .select("role_on_farm")
          .eq("farm_id", farmId)
          .eq("profile_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        setRole(data?.role_on_farm ?? null);
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return {
    role,
    isManager: !!role && MANAGER_ROLES.includes(role),
    loading,
  };
}
