"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { sw } from "@/lib/i18n/sw";
import { supabase } from "@/lib/supabase";

export type Lang = "en" | "sw";

const STORAGE_KEY = "shamba_language";
/* The setup wizard stored its choice under this key before the toggle was shared. */
const LEGACY_KEY = "shamba_onboarding_language";

type LanguageContextValue = { lang: Lang; setLang: (value: Lang) => void };
const LanguageContext = createContext<LanguageContextValue>({ lang: "en", setLang: () => {} });

function readSaved(): Lang | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    return saved === "sw" || saved === "en" ? saved : null;
  } catch {
    return null;
  }
}

function asLang(value: unknown): Lang | null {
  return value === "sw" || value === "en" ? value : null;
}

/**
 * Site-wide English / Kiswahili choice. Order of precedence: a choice made on
 * this device, then the language saved on the signed-in account (so a farmer
 * who set up in Kiswahili on WhatsApp gets Kiswahili on any device), then the
 * browser's own language. Toggling saves to both the device and the account.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      setLangState(saved);
      return;
    }
    if (navigator.language.toLowerCase().startsWith("sw")) setLangState("sw");

    // No choice on this device yet: use the account's, now and on sign-in.
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      const fromAccount = asLang(data.session?.user?.user_metadata?.lang);
      if (!cancelled && fromAccount) setLangState(fromAccount);
    }).catch(() => {});
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (readSaved()) return;
      const fromAccount = asLang(session?.user?.user_metadata?.lang);
      if (fromAccount) setLangState(fromAccount);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang(next: Lang) {
      setLangState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
        window.localStorage.setItem(LEGACY_KEY, next);
      } catch {
        /* Private mode or blocked storage: the choice just lasts for this page. */
      }
      // Best effort: remember it on the account so other devices follow.
      supabase.auth.getSession().then(({ data }) => {
        if (data.session && data.session.user.user_metadata?.lang !== next) {
          return supabase.auth.updateUser({ data: { lang: next } });
        }
      }).catch(() => {});
    },
  }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): [Lang, (value: Lang) => void] {
  const { lang, setLang } = useContext(LanguageContext);
  return [lang, setLang];
}

export type Translate = (text: string, vars?: Record<string, string | number>) => string;

/**
 * Translate an English UI string. Looks the English text up in the Kiswahili
 * dictionary and falls back to the English when no entry exists, so a missing
 * translation never breaks a page. `{name}` placeholders are filled from vars
 * after translation, e.g. t("{n} crops", { n: 3 }).
 */
export function useT(): Translate {
  const { lang } = useContext(LanguageContext);
  return useMemo<Translate>(() => (text, vars) => {
    let out = lang === "sw" ? (sw[text] ?? text) : text;
    if (vars) {
      for (const [key, value] of Object.entries(vars)) {
        out = out.split(`{${key}}`).join(String(value));
      }
    }
    return out;
  }, [lang]);
}
