"use client";

import { useState } from "react";
import { INITIAL_WIZARD_STATE, type WizardState } from "@/app/community/new/_lib/state";
import { WizardHeader } from "@/app/community/new/_steps/WizardHeader";
import { StepBasics } from "@/app/community/new/_steps/StepBasics";
import { StepTemplate } from "@/app/community/new/_steps/StepTemplate";
import { StepCustomize } from "@/app/community/new/_steps/StepCustomize";
import { StepNavigation } from "@/app/community/new/_steps/StepNavigation";
import { StepLaunch } from "@/app/community/new/_steps/StepLaunch";
import { Button } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

export default function NewCommunityPage() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD_STATE);

  function update(patch: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  const canAdvance = step === 1 ? Boolean(state.name.trim() && state.slug) : step === 2 ? Boolean(state.templateKey) : true;

  return (
    <div className="min-h-screen">
      <WizardHeader step={step} />

      <div className="mx-auto max-w-4xl px-6 py-10">
        {step === 1 && <StepBasics state={state} update={update} />}
        {step === 2 && <StepTemplate state={state} update={update} />}
        {step === 3 && <StepCustomize state={state} update={update} />}
        {step === 4 && <StepNavigation state={state} update={update} />}
        {step === 5 && <StepLaunch state={state} />}

        {step < 5 && (
          <div className="mt-10 flex items-center justify-between border-t border-zinc-200 pt-6">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
              <DynamicIcon name="arrow-left" size={16} />
              Back
            </Button>
            <Button onClick={() => setStep((s) => Math.min(5, s + 1))} disabled={!canAdvance}>
              Next
              <DynamicIcon name="arrow-right" size={16} />
            </Button>
          </div>
        )}

        {step === 5 && (
          <div className="mt-6">
            <Button variant="ghost" onClick={() => setStep(4)}>
              <DynamicIcon name="arrow-left" size={16} />
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
