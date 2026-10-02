"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";

/* Drafts live in localStorage under this prefix so DraftCleaner can wipe
   them all on sign-out. Never pass passwords or card details through here. */
export const DRAFT_PREFIX = "shamba:draft:";

function readDraft<T>(key: string): Partial<T> | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + key);
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

/* Drop a saved draft from outside the form, e.g. when an edit is cancelled. */
export function discardDraft(key: string) {
  removeDraft(key);
}

function removeDraft(key: string) {
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* storage blocked: nothing to remove */
  }
}

export function clearAllDrafts() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(DRAFT_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* storage blocked: nothing to clear */
  }
}

/**
 * Form state that survives a refresh. Whatever is typed is saved under `key`
 * and restored the next time a form with that key mounts. While the form
 * matches `baseline` (its untouched state) no draft is kept. Call `clear`
 * after a successful submit. A null key turns saving off.
 */
export function useFormDraft<T extends object>(
  key: string | null,
  baseline: T
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(baseline);
  const readyKey = useRef<string | null>(null);
  const skipSave = useRef(false);
  const baselineJson = JSON.stringify(baseline);

  useEffect(() => {
    readyKey.current = null;
    if (!key) return;
    const draft = readDraft<T>(key);
    if (draft) setValue((prev) => ({ ...prev, ...draft }));
    readyKey.current = key;
    /* The save effect below runs in this same commit with the pre-restore
       value; skip it so it can't overwrite the draft just read. */
    skipSave.current = true;
  }, [key]);

  useEffect(() => {
    if (!key || readyKey.current !== key) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const json = JSON.stringify(value);
    try {
      if (json === baselineJson) window.localStorage.removeItem(DRAFT_PREFIX + key);
      else window.localStorage.setItem(DRAFT_PREFIX + key, json);
    } catch {
      /* storage full or blocked: the form still works, just without a draft */
    }
  }, [key, value, baselineJson]);

  const clear = useCallback(() => {
    if (key) removeDraft(key);
  }, [key]);

  return [value, setValue, clear];
}
