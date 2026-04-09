"use client";

import { useState, useEffect } from "react";

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Start with the actual navigator.onLine status
    setIsOnline(navigator.onLine);

    // Debounced status change handler to prevent flickering
    let timeoutId: NodeJS.Timeout;

    const handleStatusChange = (online: boolean) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsOnline(online);
        console.log(`[Online] App is now ${online ? "online" : "offline"}`);
      }, 100);
    };

    const handleOnline = () => handleStatusChange(true);
    const handleOffline = () => handleStatusChange(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
