// Core domain types for the Community Builder. These mirror
// migrations/create_community_builder_schema.sql table-for-table — keep both in sync.

export type CommunityPrivacy = "public" | "private" | "invite_only";
export type CommunityPricingType = "free" | "paid";
export type CommunityStatus = "draft" | "launched" | "archived";
export type NavStyle = "sidebar" | "top" | "grouped_sidebar";

export interface Community {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  privacy: CommunityPrivacy;
  pricing_type: CommunityPricingType;
  template_key: string;
  transformation_goal: string | null;
  nav_style: NavStyle;
  nav_collapsible: boolean;
  settings: Record<string, unknown>;
  status: CommunityStatus;
  created_at: string;
  updated_at: string;
}

export type BillingInterval = "one_time" | "monthly" | "yearly" | "free";

export interface MembershipPlan {
  id: string;
  community_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_interval: BillingInterval;
  features: string[];
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export type CommunityRole = "owner" | "admin" | "moderator" | "member";
export type MemberStatus = "active" | "pending" | "banned";

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: CommunityRole;
  plan_id: string | null;
  status: MemberStatus;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  joined_at: string;
  created_at: string;
}

export type ProfileFieldType =
  | "text"
  | "textarea"
  | "number"
  | "location"
  | "website"
  | "social_links"
  | "checkbox"
  | "select"
  | "radio"
  | "date"
  | "photo"
  | "gallery"
  | "skills"
  | "interests"
  | "needs_help_with"
  | "can_help_with"
  | "experience_level"
  | "custom";

export interface ProfileFieldDef {
  id: string;
  community_id: string;
  key: string;
  label: string;
  field_type: ProfileFieldType;
  options: string[];
  required: boolean;
  show_in_directory: boolean;
  filterable: boolean;
  sort_order: number;
  created_at: string;
}

export interface ProfileFieldValue {
  id: string;
  member_id: string;
  field_id: string;
  value: unknown;
  updated_at: string;
}

export const SPACE_TYPES = [
  "discussion",
  "journal",
  "timeline",
  "gallery",
  "events",
  "courses",
  "directory",
  "marketplace",
  "files",
  "wiki",
  "blog",
  "resources",
  "chat",
  "polls",
  "qa",
  "calendar",
  "donations",
  "livestreams",
  "podcasts",
  "progress_tracker",
  "goals",
  "leaderboard",
  "forms",
  "database",
  "challenges",
  "growth_journey",
  "custom",
] as const;

export type SpaceType = (typeof SPACE_TYPES)[number];
export type SpaceVisibility = "public" | "members" | "private";

export interface Space {
  id: string;
  community_id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  visibility: SpaceVisibility;
  sort_order: number;
  space_type: SpaceType;
  settings: Record<string, unknown>;
  group_label: string | null;
  is_hidden: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const COMPONENT_TYPES = [
  "timeline",
  "cards",
  "comments",
  "likes",
  "reactions",
  "bookmarks",
  "tags",
  "calendar",
  "checklist",
  "progress_bar",
  "leaderboard",
  "ai_summary",
  "photo_upload",
  "video_upload",
  "file_upload",
  "location",
  "map",
  "voting",
  "polls",
  "ratings",
  "pinned_items",
  "search",
  "filters",
  "custom_fields",
  "notifications",
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export interface SpaceComponent {
  id: string;
  space_id: string;
  component_type: ComponentType;
  config: Record<string, unknown>;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
}

export type NavItemType = "space" | "group" | "link";

export interface NavigationItem {
  id: string;
  community_id: string;
  space_id: string | null;
  parent_id: string | null;
  item_type: NavItemType;
  label: string;
  icon: string | null;
  url: string | null;
  sort_order: number;
  is_collapsible: boolean;
  created_at: string;
}

export type JournalFieldType =
  | "checkbox"
  | "photos"
  | "videos"
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "location"
  | "rating"
  | "mood"
  | "weather"
  | "moon_phase"
  | "tags"
  | "custom";

export interface JournalFieldDef {
  id: string;
  space_id: string;
  key: string;
  label: string;
  field_type: JournalFieldType;
  options: string[];
  required: boolean;
  sort_order: number;
  created_at: string;
}

export type SpaceItemType =
  | "post"
  | "journal_entry"
  | "milestone"
  | "event"
  | "resource"
  | "poll"
  | "listing"
  | "wiki_page";

export interface SpaceItem {
  id: string;
  space_id: string;
  member_id: string;
  item_type: SpaceItemType;
  title: string | null;
  body: string | null;
  data: Record<string, unknown>;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpaceComment {
  id: string;
  item_id: string;
  member_id: string;
  body: string;
  created_at: string;
}

export interface SpaceReaction {
  id: string;
  item_id: string;
  member_id: string;
  reaction_type: string;
  created_at: string;
}

export interface Badge {
  id: string;
  community_id: string;
  name: string;
  icon: string;
  description: string | null;
  criteria: Record<string, unknown>;
  created_at: string;
}

export interface ChallengeTask {
  label: string;
  points?: number;
}

export interface Challenge {
  id: string;
  community_id: string;
  space_id: string | null;
  name: string;
  description: string | null;
  duration_days: number;
  points: number;
  badge_id: string | null;
  daily_tasks: ChallengeTask[];
  weekly_tasks: ChallengeTask[];
  completion_rules: Record<string, unknown>;
  rewards: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ChallengeParticipantStatus = "joined" | "completed" | "dropped";

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  member_id: string;
  status: ChallengeParticipantStatus;
  progress: Record<string, unknown>;
  points_earned: number;
  joined_at: string;
  completed_at: string | null;
}

export interface MemberBadge {
  id: string;
  member_id: string;
  badge_id: string;
  awarded_at: string;
}

export type TimelineEventType =
  | "journal_entry"
  | "milestone"
  | "challenge_completed"
  | "photo"
  | "achievement"
  | "badge"
  | "ai_summary"
  | "post";

export interface MemberTimelineEvent {
  id: string;
  community_id: string;
  member_id: string;
  space_id: string | null;
  event_type: TimelineEventType;
  ref_table: string | null;
  ref_id: string | null;
  title: string;
  summary: string | null;
  data: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}
