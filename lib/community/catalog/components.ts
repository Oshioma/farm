import type { ComponentType } from "@/lib/community/types";

export interface ComponentMeta {
  type: ComponentType;
  label: string;
  icon: string;
  description: string;
  group: "content" | "engagement" | "input" | "structure" | "insight";
  /** JSON-shape hint for space_components.config, shown in the builder as defaults. */
  defaultConfig: Record<string, unknown>;
}

export const COMPONENT_CATALOG: Record<ComponentType, ComponentMeta> = {
  timeline: { type: "timeline", label: "Timeline", icon: "history", description: "Chronological layout grouped by month/year.", group: "structure", defaultConfig: { groupBy: "month" } },
  cards: { type: "cards", label: "Cards", icon: "layout-grid", description: "Grid or list of content cards.", group: "structure", defaultConfig: { layout: "list" } },
  comments: { type: "comments", label: "Comments", icon: "message-circle", description: "Threaded replies on an item.", group: "engagement", defaultConfig: {} },
  likes: { type: "likes", label: "Likes", icon: "thumbs-up", description: "Single-tap appreciation.", group: "engagement", defaultConfig: {} },
  reactions: { type: "reactions", label: "Reactions", icon: "smile", description: "Emoji reactions beyond a simple like.", group: "engagement", defaultConfig: { options: ["like", "celebrate", "support", "insightful"] } },
  bookmarks: { type: "bookmarks", label: "Bookmarks", icon: "bookmark", description: "Members save items for later.", group: "engagement", defaultConfig: {} },
  tags: { type: "tags", label: "Tags", icon: "tag", description: "Freeform or admin-defined labels for organizing content.", group: "structure", defaultConfig: { options: [] } },
  calendar: { type: "calendar", label: "Calendar", icon: "calendar", description: "Date-based view of items.", group: "structure", defaultConfig: { defaultView: "month" } },
  checklist: { type: "checklist", label: "Checklist", icon: "list-checks", description: "Trackable to-do items.", group: "input", defaultConfig: { items: [] } },
  progress_bar: { type: "progress_bar", label: "Progress Bar", icon: "gauge", description: "Visual progress toward a goal or target.", group: "insight", defaultConfig: { target: 100 } },
  leaderboard: { type: "leaderboard", label: "Leaderboard", icon: "trophy", description: "Ranks members by a scoring metric.", group: "insight", defaultConfig: { metric: "points", period: "all_time" } },
  ai_summary: { type: "ai_summary", label: "AI Summary", icon: "sparkles", description: "Auto-generated recap of activity in this space.", group: "insight", defaultConfig: { cadence: "monthly" } },
  photo_upload: { type: "photo_upload", label: "Photo Upload", icon: "image", description: "Members attach photos to an entry.", group: "input", defaultConfig: { maxFiles: 10 } },
  video_upload: { type: "video_upload", label: "Video Upload", icon: "video", description: "Members attach video to an entry.", group: "input", defaultConfig: { maxFiles: 3 } },
  file_upload: { type: "file_upload", label: "File Upload", icon: "paperclip", description: "Attach documents or downloads.", group: "input", defaultConfig: { maxFiles: 5 } },
  location: { type: "location", label: "Location", icon: "map-pin", description: "A single place tied to an entry.", group: "input", defaultConfig: {} },
  map: { type: "map", label: "Map", icon: "map", description: "Plots member or entry locations on a map.", group: "insight", defaultConfig: {} },
  voting: { type: "voting", label: "Voting", icon: "arrow-up-circle", description: "Upvote/downvote on items.", group: "engagement", defaultConfig: {} },
  polls: { type: "polls", label: "Polls", icon: "bar-chart-3", description: "Multiple-choice votes with results.", group: "input", defaultConfig: { allowMultiple: false } },
  ratings: { type: "ratings", label: "Ratings", icon: "star", description: "Star or numeric rating on an item.", group: "engagement", defaultConfig: { scale: 5 } },
  pinned_items: { type: "pinned_items", label: "Pinned Items", icon: "pin", description: "Highlight important content at the top.", group: "structure", defaultConfig: {} },
  search: { type: "search", label: "Search", icon: "search", description: "Full-text search across the space.", group: "structure", defaultConfig: {} },
  filters: { type: "filters", label: "Filters", icon: "sliders-horizontal", description: "Narrow content by field values.", group: "structure", defaultConfig: { fields: [] } },
  custom_fields: { type: "custom_fields", label: "Custom Fields", icon: "list-plus", description: "Admin-defined structured fields for entries.", group: "input", defaultConfig: {} },
  notifications: { type: "notifications", label: "Notifications", icon: "bell", description: "Alert members on new activity.", group: "engagement", defaultConfig: { events: ["new_item"] } },
};

export const COMPONENT_LIST = Object.values(COMPONENT_CATALOG);
