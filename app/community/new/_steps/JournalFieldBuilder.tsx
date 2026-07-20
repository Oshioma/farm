"use client";

import { useState } from "react";
import { JOURNAL_SUBJECTS, getJournalSubject, type JournalFieldSuggestion } from "@/lib/community/catalog/journalSubjects";
import type { WizardSpaceInput } from "@/lib/community/wizardTypes";
import { DynamicIcon } from "@/lib/community/icon";
import { Button } from "@/app/community/_ui/primitives";
import type { JournalFieldType } from "@/lib/community/types";

const FIELD_TYPES: JournalFieldType[] = [
  "text", "textarea", "number", "date", "select", "checkbox", "photos", "videos",
  "location", "rating", "mood", "weather", "moon_phase", "tags", "custom",
];

export function JournalFieldBuilder({ space, onChange }: { space: WizardSpaceInput; onChange: (patch: Partial<WizardSpaceInput>) => void }) {
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState<JournalFieldType>("text");
  const fields = space.journalFields ?? [];

  function selectSubject(key: string) {
    const subject = getJournalSubject(key);
    onChange({ journalSubject: key, journalFields: subject?.suggestedFields ? [...subject.suggestedFields] : [] });
  }

  function removeField(fieldKey: string) {
    onChange({ journalFields: fields.filter((f) => f.key !== fieldKey) });
  }

  function addCustomField() {
    if (!customLabel.trim()) return;
    const key = customLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const field: JournalFieldSuggestion = { key: key || `field_${fields.length}`, label: customLabel.trim(), field_type: customType };
    onChange({ journalFields: [...fields, field] });
    setCustomLabel("");
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl bg-zinc-50 p-4">
      <div>
        <p className="text-xs font-semibold text-zinc-700">What are members documenting?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {JOURNAL_SUBJECTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => selectSubject(s.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                space.journalSubject === s.key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-zinc-700">Fields on every entry</p>
        {fields.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-400">Pick a subject above, or add custom fields below.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {fields.map((f) => (
              <span key={f.key} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700">
                <DynamicIcon name="grip-vertical" size={12} className="text-zinc-300" />
                {f.label}
                <span className="text-zinc-400">· {f.field_type}</span>
                <button type="button" onClick={() => removeField(f.key)} className="text-zinc-400 hover:text-red-600">
                  <DynamicIcon name="x" size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3">
        <input
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="Custom field name"
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-zinc-900"
        />
        <select
          value={customType}
          onChange={(e) => setCustomType(e.target.value as JournalFieldType)}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none"
        >
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Button variant="secondary" size="sm" onClick={addCustomField}>
          <DynamicIcon name="plus" size={12} />
          Add Field
        </Button>
      </div>
    </div>
  );
}
