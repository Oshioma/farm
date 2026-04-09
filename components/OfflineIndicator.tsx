"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800 border border-yellow-200 shadow-md">
      <div className="h-2 w-2 rounded-full bg-yellow-600 animate-pulse" />
      You're offline - Viewing cached data
    </div>
  );
}
