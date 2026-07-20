import type {
  BillingInterval,
  CommunityPricingType,
  CommunityPrivacy,
  NavStyle,
  ProfileFieldType,
  SpaceType,
  SpaceVisibility,
} from "@/lib/community/types";
import type { JournalFieldSuggestion } from "@/lib/community/catalog/journalSubjects";

// Shared shape between the wizard UI (client state across steps 1-5) and
// POST /api/community/create, which turns it into rows across a dozen tables.

export interface WizardPlanInput {
  name: string;
  price_cents: number;
  billing_interval: BillingInterval;
  features: string[];
}

export interface WizardSpaceInput {
  tempId: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  space_type: SpaceType;
  visibility: SpaceVisibility;
  group_label: string | null;
  is_hidden: boolean;
  journalSubject?: string;
  journalFields?: JournalFieldSuggestion[];
}

export interface WizardProfileFieldInput {
  key: string;
  label: string;
  field_type: ProfileFieldType;
  options?: string[];
  show_in_directory?: boolean;
  filterable?: boolean;
}

export interface WizardChallengeInput {
  name: string;
  description: string;
  duration_days: number;
  points: number;
  daily_tasks?: string[];
  weekly_tasks?: string[];
}

export interface CreateCommunityRequest {
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  privacy: CommunityPrivacy;
  pricingType: CommunityPricingType;
  plans: WizardPlanInput[];
  templateKey: string;
  transformationGoal: string | null;
  spaces: WizardSpaceInput[];
  profileFields: WizardProfileFieldInput[];
  challenges: WizardChallengeInput[];
  navStyle: NavStyle;
  navCollapsible: boolean;
  launch: boolean;
}
