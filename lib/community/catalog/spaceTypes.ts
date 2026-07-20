import type { ComponentType, SpaceType } from "@/lib/community/types";

// Platform-level metadata for every Space Type. This is the only place that
// knows what a space type "means" — rendering code switches on space_type
// generically (icon/label/defaultComponents), never on ad-hoc feature flags.
export interface SpaceTypeMeta {
  type: SpaceType;
  label: string;
  icon: string;
  description: string;
  defaultComponents: ComponentType[];
}

export const SPACE_TYPE_CATALOG: Record<SpaceType, SpaceTypeMeta> = {
  discussion: {
    type: "discussion",
    label: "Discussion",
    icon: "message-square",
    description: "An open feed where members post, comment and react.",
    defaultComponents: ["cards", "comments", "reactions", "pinned_items", "search"],
  },
  journal: {
    type: "journal",
    label: "Journal",
    icon: "notebook-pen",
    description: "Members log structured entries over time — the building block of a Growth Journey.",
    defaultComponents: ["timeline", "custom_fields", "photo_upload", "comments", "reactions"],
  },
  timeline: {
    type: "timeline",
    label: "Timeline",
    icon: "history",
    description: "A chronological feed of milestones and updates.",
    defaultComponents: ["timeline", "cards", "reactions"],
  },
  gallery: {
    type: "gallery",
    label: "Gallery",
    icon: "images",
    description: "A visual grid for photos and videos members share.",
    defaultComponents: ["photo_upload", "video_upload", "reactions", "comments", "tags"],
  },
  events: {
    type: "events",
    label: "Events",
    icon: "calendar-days",
    description: "Upcoming and past events with RSVPs.",
    defaultComponents: ["calendar", "cards", "notifications"],
  },
  courses: {
    type: "courses",
    label: "Courses",
    icon: "graduation-cap",
    description: "Structured lessons and curriculum members progress through.",
    defaultComponents: ["progress_bar", "checklist", "comments", "file_upload"],
  },
  directory: {
    type: "directory",
    label: "Directory",
    icon: "users",
    description: "A searchable, filterable list of members.",
    defaultComponents: ["search", "filters", "cards"],
  },
  marketplace: {
    type: "marketplace",
    label: "Marketplace",
    icon: "store",
    description: "Members list and browse products or services.",
    defaultComponents: ["cards", "photo_upload", "search", "filters", "ratings"],
  },
  files: {
    type: "files",
    label: "Files",
    icon: "folder",
    description: "Shared documents and downloads.",
    defaultComponents: ["file_upload", "search", "tags"],
  },
  wiki: {
    type: "wiki",
    label: "Knowledge Base",
    icon: "book-open",
    description: "Long-form reference articles organized by category.",
    defaultComponents: ["search", "tags", "pinned_items"],
  },
  blog: {
    type: "blog",
    label: "Blog",
    icon: "pen-line",
    description: "Announcements and long-form posts from admins.",
    defaultComponents: ["cards", "comments", "reactions", "pinned_items"],
  },
  resources: {
    type: "resources",
    label: "Resources",
    icon: "library",
    description: "Curated links, guides and downloads.",
    defaultComponents: ["cards", "tags", "search", "bookmarks"],
  },
  chat: {
    type: "chat",
    label: "Chat",
    icon: "messages-square",
    description: "Real-time conversation for the community.",
    defaultComponents: ["notifications"],
  },
  polls: {
    type: "polls",
    label: "Polls",
    icon: "bar-chart-3",
    description: "Quick votes to gather member opinion.",
    defaultComponents: ["voting", "cards"],
  },
  qa: {
    type: "qa",
    label: "Q&A",
    icon: "help-circle",
    description: "Members ask questions and vote on the best answers.",
    defaultComponents: ["voting", "comments", "search", "tags"],
  },
  calendar: {
    type: "calendar",
    label: "Calendar",
    icon: "calendar",
    description: "A shared calendar of dates that matter to the community.",
    defaultComponents: ["calendar", "notifications"],
  },
  donations: {
    type: "donations",
    label: "Donations",
    icon: "heart-handshake",
    description: "Track fundraising campaigns and contributions.",
    defaultComponents: ["progress_bar", "cards"],
  },
  livestreams: {
    type: "livestreams",
    label: "Livestreams",
    icon: "video",
    description: "Live and recorded video sessions.",
    defaultComponents: ["calendar", "comments", "notifications"],
  },
  podcasts: {
    type: "podcasts",
    label: "Podcast",
    icon: "mic",
    description: "Audio episodes members can browse and play.",
    defaultComponents: ["cards", "search", "tags"],
  },
  progress_tracker: {
    type: "progress_tracker",
    label: "Progress Tracker",
    icon: "trending-up",
    description: "Members log recurring metrics and watch trends over time.",
    defaultComponents: ["progress_bar", "checklist", "custom_fields"],
  },
  goals: {
    type: "goals",
    label: "Goals",
    icon: "target",
    description: "Members set goals and track completion.",
    defaultComponents: ["checklist", "progress_bar", "custom_fields"],
  },
  leaderboard: {
    type: "leaderboard",
    label: "Leaderboard",
    icon: "trophy",
    description: "Ranks members by points, streaks or contribution.",
    defaultComponents: ["leaderboard"],
  },
  forms: {
    type: "forms",
    label: "Forms",
    icon: "clipboard-list",
    description: "Structured intake forms and submissions.",
    defaultComponents: ["custom_fields"],
  },
  database: {
    type: "database",
    label: "Database",
    icon: "table",
    description: "A structured, filterable table of custom records.",
    defaultComponents: ["custom_fields", "filters", "search"],
  },
  challenges: {
    type: "challenges",
    label: "Challenges",
    icon: "flag",
    description: "Time-boxed programs members join and complete for points and badges.",
    defaultComponents: ["checklist", "progress_bar", "leaderboard"],
  },
  growth_journey: {
    type: "growth_journey",
    label: "Growth Journey",
    icon: "sprout",
    description: "Every member's personal timeline, aggregated automatically from their activity.",
    defaultComponents: ["timeline", "ai_summary"],
  },
  custom: {
    type: "custom",
    label: "Custom",
    icon: "sparkles",
    description: "Start from a blank space and assemble your own components.",
    defaultComponents: ["cards"],
  },
};

export const SPACE_TYPE_LIST = Object.values(SPACE_TYPE_CATALOG);
