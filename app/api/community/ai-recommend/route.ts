import { NextRequest, NextResponse } from "next/server";
import { ruleBasedAiSetupEngine } from "@/lib/community/catalog/aiSetup";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const templateKey = typeof body?.templateKey === "string" ? body.templateKey : "custom";
  const transformationGoal = typeof body?.transformationGoal === "string" ? body.transformationGoal : "";

  // Deterministic today (see lib/community/catalog/aiSetup.ts); this route is the
  // seam where a real LLM call would slot in later without changing the wizard.
  const recommendation = ruleBasedAiSetupEngine.recommend({ templateKey, transformationGoal });

  return NextResponse.json(recommendation);
}
