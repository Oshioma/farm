"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getSpace } from "@/lib/community/spaces";
import { createJournalField, deleteJournalField, getJournalFields, seedJournalFields } from "@/lib/community/journal";
import type { JournalFieldDef, JournalFieldType, Space } from "@/lib/community/types";
import { JOURNAL_SUBJECTS } from "@/lib/community/catalog/journalSubjects";
import { useAdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { Button, Card } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

const FIELD_TYPES: JournalFieldType[] = [
  "text", "textarea", "number", "date", "select", "checkbox", "photos", "videos",
  "location", "rating", "mood", "weather", "moon_phase", "tags", "custom",
];

export default function JournalFieldsPage({ params }: { params: Promise<{ slug: string; spaceId: string }> }) {
  const { spaceId } = use(params);
  const { community } = useAdminContext();
  const [space, setSpace] = useState<Space | null>(null);
  const [fields, setFields] = useState<JournalFieldDef[]>([]);
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState<JournalFieldType>("text");

  useEffect(() => {
    getSpace(spaceId).then(setSpace);
    getJournalFields(spaceId).then(setFields);
  }, [spaceId]);

  async function applySubject(key: string) {
    const subject = JOURNAL_SUBJECTS.find((s) => s.key === key);
    if (!subject) return;
    const toAdd = subject.suggestedFields.filter((f) => !fields.some((existing) => existing.key === f.key));
    await seedJournalFields(spaceId, toAdd);
    setFields(await getJournalFields(spaceId));
  }

  async function addCustom() {
    if (!customLabel.trim()) return;
    const key = customLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `field_${fields.length}`;
    const created = await createJournalField({ space_id: spaceId, key, label: customLabel.trim(), field_type: customType, options: [], required: false, sort_order: fields.length });
    setFields([...fields, created]);
    setCustomLabel("");
  }

  async function removeField(id: string) {
    await deleteJournalField(id);
    setFields(fields.filter((f) => f.id !== id));
  }

  if (!space) return <p className="text-sm text-zinc-400">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <Link href={`/community/${community.slug}/admin/spaces`} className="text-xs font-medium text-zinc-400 hover:text-zinc-900">
        ← Spaces
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900">{space.name} — Journal Fields</h1>
      <p className="mt-1 text-sm text-zinc-500">Every entry members log in this Space will include these fields.</p>

      <Card className="mt-6 p-6">
        <p className="text-xs font-semibold text-zinc-700">Seed from a subject</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {JOURNAL_SUBJECTS.filter((s) => s.key !== "custom").map((s) => (
            <button key={s.key} type="button" onClick={() => applySubject(s.key)} className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-900 hover:text-zinc-900">
              {s.label}
            </button>
          ))}
        </div>

        <p className="mt-6 text-xs font-semibold text-zinc-700">Current fields</p>
        {fields.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-400">No fields yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {fields.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700">
                {f.label}
                <span className="text-zinc-400">· {f.field_type}</span>
                <button type="button" onClick={() => removeField(f.id)} className="text-zinc-400 hover:text-red-600">
                  <DynamicIcon name="x" size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4">
          <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Custom field name" className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none focus:border-zinc-900" />
          <select value={customType} onChange={(e) => setCustomType(e.target.value as JournalFieldType)} className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs outline-none">
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={addCustom}>
            <DynamicIcon name="plus" size={12} />
            Add Field
          </Button>
        </div>
      </Card>
    </div>
  );
}
