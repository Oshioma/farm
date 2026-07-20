"use client";

import { useState } from "react";
import type { WizardState } from "@/app/community/new/_lib/state";
import { applyRecommendation, spacesFromTemplate } from "@/app/community/new/_lib/state";
import { COMMUNITY_TEMPLATES, getCommunityTemplate } from "@/lib/community/catalog/communityTemplates";
import { TRANSFORMATION_GOAL_PRESETS, type SetupRecommendation } from "@/lib/community/catalog/aiSetup";
import { Button, Card } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

export function StepTemplate({ state, update }: { state: WizardState; update: (patch: Partial<WizardState>) => void }) {
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  function selectTemplate(key: string) {
    const template = getCommunityTemplate(key)!;
    update({
      templateKey: key,
      spaces: spacesFromTemplate(template),
      profileFields: template.defaultProfileFields.map((f) => ({ ...f })),
      challenges: template.defaultChallenges.map((c) => ({ ...c })),
      aiRationale: [],
    });
  }

  async function getAiRecommendations() {
    if (!state.templateKey) return;
    setLoadingAi(true);
    setAiError(null);
    try {
      const res = await fetch("/api/community/ai-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey: state.templateKey, transformationGoal: state.transformationGoal }),
      });
      if (!res.ok) throw new Error("Couldn't generate recommendations");
      const rec: SetupRecommendation = await res.json();
      update(applyRecommendation(state, rec));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">What type of community are you creating?</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Each template installs a recommended set of Spaces automatically — you can change everything in the next step.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {COMMUNITY_TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => selectTemplate(t.key)}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              state.templateKey === t.key ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <DynamicIcon name={t.icon} size={18} />
            </div>
            <p className="mt-3 text-sm font-bold text-zinc-900">{t.label}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{t.tagline}</p>
          </button>
        ))}
      </div>

      {state.templateKey && (
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <DynamicIcon name="sparkles" size={18} className="text-zinc-700" />
            <span className="text-sm font-semibold text-zinc-800">What transformation are you helping members achieve?</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">This tunes your Spaces, profile fields, challenges and navigation — everything stays editable afterward.</p>

          <input
            value={state.transformationGoal}
            onChange={(e) => update({ transformationGoal: e.target.value })}
            placeholder="e.g. Grow Food"
            className="mt-3 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {TRANSFORMATION_GOAL_PRESETS.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => update({ transformationGoal: goal })}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-900 hover:text-zinc-900"
              >
                {goal}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <Button onClick={getAiRecommendations} disabled={loadingAi}>
              <DynamicIcon name="wand-2" size={16} />
              {loadingAi ? "Thinking…" : "Get AI Recommendations"}
            </Button>
            {aiError && <p className="mt-2 text-xs text-red-600">{aiError}</p>}
          </div>

          {state.aiRationale.length > 0 && (
            <ul className="mt-4 space-y-1.5 rounded-xl bg-zinc-50 p-4 text-xs text-zinc-600">
              {state.aiRationale.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <DynamicIcon name="check" size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                  {line}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
