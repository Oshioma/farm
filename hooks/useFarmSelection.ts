"use client";

import { Dispatch, SetStateAction, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getActiveFarmId, saveActiveFarmId } from "@/lib/farm";
import type { Farm } from "@/lib/farm";

type UseFarmSelectionOptions = {
  farms: Farm[];
  activeFarmId: string;
  setActiveFarmId: Dispatch<SetStateAction<string>>;
  preferredFarmName?: string;
};

function getPreferredFarmId(farms: Farm[], preferredFarmName?: string): string {
  if (preferredFarmName) {
    const normalizedName = preferredFarmName.trim().toLowerCase();
    const preferredFarm = farms.find((farm) =>
      farm.name.toLowerCase().includes(normalizedName)
    );
    if (preferredFarm) return preferredFarm.id;
  }
  return farms[0]?.id ?? "";
}

export function useFarmSelection({
  farms,
  activeFarmId,
  setActiveFarmId,
  preferredFarmName,
}: UseFarmSelectionOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedFarmId = searchParams.get("farmId") ?? "";
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    if (!farms.length) return;

    if (requestedFarmId && farms.some((farm) => farm.id === requestedFarmId)) {
      setActiveFarmId((current) =>
        current === requestedFarmId ? current : requestedFarmId
      );
      return;
    }

    if (activeFarmId && farms.some((farm) => farm.id === activeFarmId)) return;

    let cancelled = false;

    (async () => {
      const savedFarmId = await getActiveFarmId();
      if (cancelled) return;

      if (savedFarmId && farms.some((farm) => farm.id === savedFarmId)) {
        setActiveFarmId(savedFarmId);
        return;
      }

      const fallbackFarmId = getPreferredFarmId(farms, preferredFarmName);
      if (fallbackFarmId) setActiveFarmId(fallbackFarmId);
    })();

    return () => {
      cancelled = true;
    };
  }, [farms, requestedFarmId, activeFarmId, setActiveFarmId, preferredFarmName]);

  useEffect(() => {
    if (!activeFarmId) return;
    void saveActiveFarmId(activeFarmId);
  }, [activeFarmId]);

  useEffect(() => {
    if (!activeFarmId || requestedFarmId === activeFarmId) return;
    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("farmId", activeFarmId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [activeFarmId, requestedFarmId, searchParamsString, router, pathname]);
}
