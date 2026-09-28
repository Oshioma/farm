"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

const STORAGE_KEY = "shamba_language";

/**
 * A language for pages that must open in the right language on the very
 * first paint (the WhatsApp sign-up, PIN sign-in and setup pages). The site
 * provider starts in English and only learns the device's choice after
 * mounting, which showed English for a moment before switching; these pages
 * know their language from the server instead, and render in it straight away.
 *
 * With `preferSaved`, a language already chosen on this device still wins
 * once the page mounts. The toggle updates the page and the site-wide choice.
 */
export function usePageLanguage(initial: Lang, { preferSaved }: { preferSaved: boolean }): [Lang, (value: Lang) => void] {
  const [, setSiteLang] = useLanguage();
  const [lang, setLang] = useState<Lang>(initial);

  useEffect(() => {
    let saved: string | null = null;
    if (preferSaved) {
      try {
        saved = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        /* Storage blocked: keep the page's language. */
      }
    }
    const start: Lang = saved === "en" || saved === "sw" ? saved : initial;
    setLang(start);
    setSiteLang(start);
    // Once, on mount: later changes come from the toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(value: Lang) {
    setLang(value);
    setSiteLang(value);
  }

  return [lang, choose];
}
