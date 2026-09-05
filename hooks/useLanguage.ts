"use client";

import { useEffect, useState } from "react";

export type Lang = "en" | "sw";

const STORAGE_KEY = "shamba_language";
/* The setup wizard stored its choice under this key before the toggle was shared. */
const LEGACY_KEY = "shamba_onboarding_language";

function readSaved(): Lang | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    return saved === "sw" || saved === "en" ? saved : null;
  } catch {
    return null;
  }
}

/**
 * Site-wide English / Kiswahili choice, remembered in the browser. Defaults to
 * Kiswahili when the browser itself is set to it, English otherwise.
 */
export function useLanguage(): [Lang, (value: Lang) => void] {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      setLangState(saved);
    } else if (navigator.language.toLowerCase().startsWith("sw")) {
      setLangState("sw");
    }
  }, []);

  function setLang(value: Lang) {
    setLangState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
      window.localStorage.setItem(LEGACY_KEY, value);
    } catch {
      /* Private mode or blocked storage: the choice just lasts for this page. */
    }
  }

  return [lang, setLang];
}
