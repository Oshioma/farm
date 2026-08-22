"use client";

import { useEffect, useState } from "react";

/**
 * Notification links carry the row they are about — /farm?task=<id>. This
 * reads that id, scrolls to the element with the matching DOM id, and hands
 * back the id so the row can mark itself for a moment.
 *
 * The URL is read from the browser rather than useSearchParams so the page
 * needs no Suspense boundary, and a custom event covers clicking a
 * notification while already on the page, where nothing remounts.
 */
export const FOCUS_EVENT = "shamba:focus";
const HIGHLIGHT_MS = 5000;

export function useFocusTarget(param: string, domPrefix: string, ready: boolean) {
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    const read = (search: string) => {
      const id = new URLSearchParams(search).get(param);
      if (id) setFocusId(id);
    };

    read(window.location.search);

    const onFocusEvent = (e: Event) => {
      const link = (e as CustomEvent<string>).detail;
      if (typeof link !== "string") return;
      const query = link.includes("?") ? link.slice(link.indexOf("?")) : "";
      read(query);
    };

    window.addEventListener(FOCUS_EVENT, onFocusEvent);
    return () => window.removeEventListener(FOCUS_EVENT, onFocusEvent);
  }, [param]);

  /* Wait until the rows are on the page before trying to scroll to one. */
  useEffect(() => {
    if (!focusId || !ready) return;
    const el = document.getElementById(`${domPrefix}-${focusId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setFocusId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [focusId, ready, domPrefix]);

  return focusId;
}
