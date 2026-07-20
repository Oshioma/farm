"use client";

import { useEffect, useState } from "react";
import type { WizardState } from "@/app/community/new/_lib/state";
import { slugify } from "@/lib/community/communities";
import { Button, Card } from "@/app/community/_ui/primitives";
import { FileUploader } from "@/app/community/_ui/FileUploader";
import { DynamicIcon } from "@/lib/community/icon";
import type { WizardPlanInput } from "@/lib/community/wizardTypes";

const PRIVACY_OPTIONS: { value: WizardState["privacy"]; label: string; description: string; icon: string }[] = [
  { value: "public", label: "Public", description: "Anyone can find and view this community.", icon: "globe" },
  { value: "private", label: "Private", description: "Visible in search, but content is members-only.", icon: "lock" },
  { value: "invite_only", label: "Invite Only", description: "Hidden — members must be invited to join.", icon: "mail" },
];

export function StepBasics({ state, update }: { state: WizardState; update: (patch: Partial<WizardState>) => void }) {
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  useEffect(() => {
    if (!state.slug) {
      setSlugStatus("idle");
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(state.slug)) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
    const handle = setTimeout(() => {
      fetch(`/api/community/slug-check?slug=${encodeURIComponent(state.slug)}`)
        .then((r) => r.json())
        .then((data) => setSlugStatus(data.available ? "available" : "taken"))
        .catch(() => setSlugStatus("idle"));
    }, 400);
    return () => clearTimeout(handle);
  }, [state.slug]);

  function handleNameChange(name: string) {
    update({ name, slug: state.slugTouched ? state.slug : slugify(name) });
  }

  function addPlan() {
    const plan: WizardPlanInput = { name: "", price_cents: 0, billing_interval: "monthly", features: [] };
    update({ plans: [...state.plans, plan] });
  }

  function updatePlan(i: number, patch: Partial<WizardPlanInput>) {
    update({ plans: state.plans.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  }

  function removePlan(i: number) {
    update({ plans: state.plans.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Let&apos;s set up your community</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Start with the basics — you can change all of this later in Settings.</p>
      </div>

      <Card className="p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-zinc-800">Community Name</span>
            <input
              value={state.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Grow Together"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-zinc-800">Community URL</span>
            <div className="mt-1.5 flex items-center rounded-xl border border-zinc-200 px-3.5 py-2.5 focus-within:border-zinc-900">
              <span className="text-sm text-zinc-400">app.community/</span>
              <input
                value={state.slug}
                onChange={(e) => update({ slug: slugify(e.target.value), slugTouched: true })}
                className="w-full text-sm outline-none"
              />
            </div>
            <p className="mt-1 text-xs">
              {slugStatus === "checking" && <span className="text-zinc-400">Checking availability…</span>}
              {slugStatus === "available" && <span className="text-emerald-600">Available</span>}
              {slugStatus === "taken" && <span className="text-red-600">That URL is already taken</span>}
              {slugStatus === "invalid" && <span className="text-red-600">Use lowercase letters, numbers and dashes only</span>}
            </p>
          </label>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-zinc-800">Description</span>
          <textarea
            value={state.description}
            onChange={(e) => update({ description: e.target.value })}
            rows={3}
            placeholder="What is this community for, and who is it for?"
            className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
          />
        </label>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <span className="text-sm font-semibold text-zinc-800">Logo</span>
            <div className="mt-1.5">
              <FileUploader
                scope="onboarding/logo"
                kind="image"
                multiple={false}
                value={state.logoUrl ? [state.logoUrl] : []}
                onChange={(urls) => update({ logoUrl: urls[0] ?? "" })}
              />
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold text-zinc-800">Banner</span>
            <div className="mt-1.5">
              <FileUploader
                scope="onboarding/banner"
                kind="image"
                multiple={false}
                value={state.bannerUrl ? [state.bannerUrl] : []}
                onChange={(urls) => update({ bannerUrl: urls[0] ?? "" })}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <span className="text-sm font-semibold text-zinc-800">Privacy</span>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {PRIVACY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ privacy: opt.value })}
              className={`rounded-xl border-2 p-4 text-left transition ${
                state.privacy === opt.value ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <DynamicIcon name={opt.icon} size={18} className="text-zinc-700" />
              <p className="mt-2 text-sm font-bold text-zinc-900">{opt.label}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{opt.description}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <span className="text-sm font-semibold text-zinc-800">Free or Paid</span>
        <div className="mt-3 flex gap-3">
          {(["free", "paid"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => update({ pricingType: opt })}
              className={`rounded-xl border-2 px-5 py-2.5 text-sm font-semibold capitalize transition ${
                state.pricingType === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-700 hover:border-zinc-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {state.pricingType === "paid" && (
          <div className="mt-5 space-y-3">
            <span className="text-sm font-semibold text-zinc-800">Membership Plans</span>
            {state.plans.map((plan, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 p-3">
                <input
                  value={plan.name}
                  onChange={(e) => updatePlan(i, { name: e.target.value })}
                  placeholder="Plan name"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                />
                <div className="flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2">
                  <span className="text-sm text-zinc-400">$</span>
                  <input
                    type="number"
                    min={0}
                    value={plan.price_cents / 100}
                    onChange={(e) => updatePlan(i, { price_cents: Math.round(Number(e.target.value) * 100) })}
                    className="w-16 text-sm outline-none"
                  />
                </div>
                <select
                  value={plan.billing_interval}
                  onChange={(e) => updatePlan(i, { billing_interval: e.target.value as WizardPlanInput["billing_interval"] })}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none"
                >
                  <option value="monthly">/month</option>
                  <option value="yearly">/year</option>
                  <option value="one_time">one-time</option>
                </select>
                <button type="button" onClick={() => removePlan(i)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-red-600">
                  <DynamicIcon name="trash-2" size={16} />
                </button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={addPlan}>
              <DynamicIcon name="plus" size={14} />
              Add Plan
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
