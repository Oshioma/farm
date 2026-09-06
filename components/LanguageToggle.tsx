"use client";

import { Languages } from "lucide-react";
import type { Lang } from "@/hooks/useLanguage";

type Props = {
  lang: Lang;
  onChange: (value: Lang) => void;
  className?: string;
};

export function LanguageToggle({ lang, onChange, className = "" }: Props) {
  const pill = (value: Lang, label: string) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      aria-pressed={lang === value}
      className={"rounded-full px-3 py-1.5 text-sm font-semibold transition " + (lang === value ? "bg-emerald-700 text-white" : "text-zinc-600 hover:text-zinc-900")}
    >
      {label}
    </button>
  );
  return (
    <div className={"inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-sm " + className}>
      <Languages className="ml-2 h-4 w-4 text-emerald-700" aria-hidden="true" />
      {pill("en", "English")}
      {pill("sw", "Kiswahili")}
    </div>
  );
}
