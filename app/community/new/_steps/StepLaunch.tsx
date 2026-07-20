"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WizardState } from "@/app/community/new/_lib/state";
import { Button, Card, Pill } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";
import type { CreateCommunityRequest } from "@/lib/community/wizardTypes";
import { getCommunityTemplate } from "@/lib/community/catalog/communityTemplates";

function toRequest(state: WizardState, launch: boolean): CreateCommunityRequest {
  return {
    name: state.name.trim(),
    slug: state.slug,
    description: state.description,
    logoUrl: state.logoUrl || null,
    bannerUrl: state.bannerUrl || null,
    privacy: state.privacy,
    pricingType: state.pricingType,
    plans: state.plans,
    templateKey: state.templateKey || "custom",
    transformationGoal: state.transformationGoal || null,
    spaces: state.spaces,
    profileFields: state.profileFields,
    challenges: state.challenges,
    navStyle: state.navStyle,
    navCollapsible: state.navCollapsible,
    launch,
  };
}

export function StepLaunch({ state }: { state: WizardState }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const template = getCommunityTemplate(state.templateKey || "custom");
  const visibleSpaces = state.spaces.filter((s) => !s.is_hidden);

  async function submit(launch: boolean) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/community/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRequest(state, launch)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create community");
      router.push(`/community/${state.slug}/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Ready to launch</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Here&apos;s what we&apos;ll set up. You can change any of it after launch.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white">
            <DynamicIcon name={template?.icon ?? "sparkles"} size={24} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-zinc-900">{state.name || "Untitled community"}</h2>
            <p className="text-sm text-zinc-500">app.community/{state.slug}</p>
            {state.description && <p className="mt-1.5 text-sm text-zinc-600">{state.description}</p>}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Pill>{template?.label ?? "Custom"}</Pill>
          <Pill tone={state.privacy === "public" ? "emerald" : "neutral"}>{state.privacy.replace("_", " ")}</Pill>
          <Pill tone={state.pricingType === "paid" ? "amber" : "neutral"}>{state.pricingType}</Pill>
          <Pill>{visibleSpaces.length} spaces</Pill>
          <Pill>{state.profileFields.length} profile fields</Pill>
          {state.challenges.length > 0 && <Pill>{state.challenges.length} challenges</Pill>}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleSpaces.map((s) => (
            <div key={s.tempId} className="flex items-center gap-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700">
              <DynamicIcon name={s.icon} size={13} />
              <span className="truncate">{s.name}</span>
            </div>
          ))}
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => submit(true)} disabled={submitting || !state.name || !state.slug}>
          <DynamicIcon name="rocket" size={16} />
          {submitting ? "Launching…" : "Launch Community"}
        </Button>
        <Button variant="secondary" onClick={() => submit(false)} disabled={submitting || !state.name || !state.slug}>
          Save as Draft
        </Button>
      </div>
    </div>
  );
}
