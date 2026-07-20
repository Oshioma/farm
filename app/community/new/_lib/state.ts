import type {
  CommunityPricingType,
  CommunityPrivacy,
  NavStyle,
  SpaceType,
  SpaceVisibility,
} from "@/lib/community/types";
import type {
  WizardChallengeInput,
  WizardPlanInput,
  WizardProfileFieldInput,
  WizardSpaceInput,
} from "@/lib/community/wizardTypes";
import type { CommunityTemplate } from "@/lib/community/catalog/communityTemplates";
import type { SetupRecommendation } from "@/lib/community/catalog/aiSetup";
import { getJournalSubject } from "@/lib/community/catalog/journalSubjects";
import { slugify } from "@/lib/community/communities";

export interface WizardState {
  name: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  privacy: CommunityPrivacy;
  pricingType: CommunityPricingType;
  plans: WizardPlanInput[];
  templateKey: string;
  transformationGoal: string;
  aiRationale: string[];
  spaces: WizardSpaceInput[];
  profileFields: WizardProfileFieldInput[];
  challenges: WizardChallengeInput[];
  navStyle: NavStyle;
  navCollapsible: boolean;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  name: "",
  slug: "",
  slugTouched: false,
  description: "",
  logoUrl: "",
  bannerUrl: "",
  privacy: "public",
  pricingType: "free",
  plans: [],
  templateKey: "",
  transformationGoal: "",
  aiRationale: [],
  spaces: [],
  profileFields: [],
  challenges: [],
  navStyle: "sidebar",
  navCollapsible: true,
};

let tempIdCounter = 0;
export function nextTempId(prefix: string): string {
  tempIdCounter += 1;
  return `${prefix}-${Date.now()}-${tempIdCounter}`;
}

function uniqueSpaceSlug(existing: WizardSpaceInput[], base: string): string {
  const root = slugify(base) || "space";
  const taken = new Set(existing.map((s) => s.slug));
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

export function spacesFromTemplate(template: CommunityTemplate): WizardSpaceInput[] {
  return template.defaultSpaces.map((s) => ({
    tempId: nextTempId("space"),
    name: s.name,
    slug: s.slug,
    icon: s.icon,
    description: s.description,
    space_type: s.space_type,
    visibility: s.visibility ?? "members",
    group_label: s.group_label ?? null,
    is_hidden: false,
    journalSubject: s.journalSubject,
    journalFields: s.journalSubject ? getJournalSubject(s.journalSubject)?.suggestedFields : undefined,
  }));
}

export function applyRecommendation(state: WizardState, rec: SetupRecommendation): WizardState {
  return {
    ...state,
    spaces: rec.spaces.map((s) => ({
      tempId: nextTempId("space"),
      name: s.name,
      slug: s.slug,
      icon: s.icon,
      description: s.description,
      space_type: s.space_type,
      visibility: s.visibility ?? "members",
      group_label: s.group_label ?? null,
      is_hidden: false,
      journalSubject: s.journalSubject,
      journalFields: s.journalSubject ? getJournalSubject(s.journalSubject)?.suggestedFields : undefined,
    })),
    profileFields: rec.profileFields.map((f) => ({ ...f })),
    challenges: rec.challenges.map((c) => ({ ...c })),
    navStyle: rec.navStyle,
    aiRationale: rec.rationale,
  };
}

export function addSpace(state: WizardState, name: string, spaceType: SpaceType, icon: string): WizardSpaceInput {
  return {
    tempId: nextTempId("space"),
    name,
    slug: uniqueSpaceSlug(state.spaces, name),
    icon,
    description: "",
    space_type: spaceType,
    visibility: "members" as SpaceVisibility,
    group_label: null,
    is_hidden: false,
  };
}

export function reorder<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}
