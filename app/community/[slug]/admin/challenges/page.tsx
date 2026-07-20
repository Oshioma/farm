"use client";

import { useEffect, useState } from "react";
import { useAdminContext } from "@/app/community/[slug]/admin/_lib/AdminContext";
import { createChallenge, deleteChallenge, getChallenges } from "@/lib/community/challenges";
import type { Challenge } from "@/lib/community/types";
import { Button, Card, EmptyState, Pill } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

const EMPTY_FORM = { name: "", description: "", duration_days: 30, points: 100, tasksInput: "" };

export default function ChallengesAdminPage() {
  const { community } = useAdminContext();
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getChallenges(community.id).then(setChallenges);
  }, [community.id]);

  async function submit() {
    if (!form.name.trim()) return;
    setSaving(true);
    const tasks = form.tasksInput
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((label) => ({ label }));
    const created = await createChallenge({
      community_id: community.id,
      space_id: null,
      name: form.name.trim(),
      description: form.description,
      duration_days: form.duration_days,
      points: form.points,
      badge_id: null,
      daily_tasks: tasks,
      weekly_tasks: [],
      completion_rules: {},
      rewards: [],
    });
    setChallenges((prev) => [created, ...(prev ?? [])]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  }

  async function remove(id: string) {
    await deleteChallenge(id);
    setChallenges((prev) => prev?.filter((c) => c.id !== id) ?? null);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Challenges</h1>
      <p className="mt-1 text-sm text-zinc-500">Reusable, time-boxed programs members join for points and badges.</p>

      <div className="mt-6 space-y-3">
        {challenges === null ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : challenges.length === 0 && !showForm ? (
          <EmptyState icon="flag" title="No challenges yet" description="Create a challenge to give members a shared goal and momentum." />
        ) : (
          challenges.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-zinc-900">{c.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{c.description}</p>
                  <div className="mt-2 flex gap-2">
                    <Pill>{c.duration_days} days</Pill>
                    <Pill tone="emerald">{c.points} pts</Pill>
                  </div>
                </div>
                <button type="button" onClick={() => remove(c.id)} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600">
                  <DynamicIcon name="trash-2" size={16} />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {showForm ? (
        <Card className="mt-4 p-5">
          <div className="space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Challenge name"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              rows={2}
              className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            />
            <div className="flex gap-3">
              <label className="flex-1 text-xs font-semibold text-zinc-600">
                Duration (days)
                <input
                  type="number"
                  min={1}
                  value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                />
              </label>
              <label className="flex-1 text-xs font-semibold text-zinc-600">
                Points
                <input
                  type="number"
                  min={0}
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-zinc-600">
              Daily tasks (one per line)
              <textarea
                value={form.tasksInput}
                onChange={(e) => setForm({ ...form, tasksInput: e.target.value })}
                rows={3}
                placeholder={"Log today's entry\nShare a photo"}
                className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              />
            </label>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={saving || !form.name.trim()}>
                Create Challenge
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button variant="secondary" className="mt-4" onClick={() => setShowForm(true)}>
          <DynamicIcon name="plus" size={16} />
          New Challenge
        </Button>
      )}
    </div>
  );
}
