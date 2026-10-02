"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { clearAllDrafts } from "@/hooks/useFormDraft";

/* Form drafts belong to whoever typed them: wipe them all on sign-out, from
   any page or another tab, so the next person on this device starts clean. */
export function DraftCleaner() {
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") clearAllDrafts();
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return null;
}
