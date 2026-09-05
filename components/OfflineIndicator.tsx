"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useT } from "@/lib/i18n";

export function OfflineIndicator() {
  const t = useT();
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}
      className="fixed right-4 z-50 flex items-center gap-2 rounded-lg bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800 border border-yellow-200 shadow-md"
    >
      <div className="h-2 w-2 rounded-full bg-yellow-600 animate-pulse" />
      {t("You're offline - Viewing cached data")}
    </div>
  );
}
