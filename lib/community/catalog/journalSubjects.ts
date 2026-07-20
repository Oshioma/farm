import type { JournalFieldType } from "@/lib/community/types";

export interface JournalFieldSuggestion {
  key: string;
  label: string;
  field_type: JournalFieldType;
  options?: string[];
}

export interface JournalSubject {
  key: string;
  label: string;
  prompt: string;
  suggestedFields: JournalFieldSuggestion[];
}

// "What are members documenting?" — each subject seeds the Journal Builder's
// field picker. Admins can accept, remove, or add unlimited custom fields
// afterward (see JournalFieldDef), so this list only needs to be a strong
// starting point, not exhaustive.
export const JOURNAL_SUBJECTS: JournalSubject[] = [
  {
    key: "journey",
    label: "Journey",
    prompt: "A general log of where members are and how it's going.",
    suggestedFields: [
      { key: "photos", label: "Photos", field_type: "photos" },
      { key: "milestone", label: "This is a milestone", field_type: "checkbox" },
      { key: "mood", label: "Mood", field_type: "mood" },
      { key: "location", label: "Location", field_type: "location" },
      { key: "tags", label: "Tags", field_type: "tags" },
      { key: "notes", label: "Notes", field_type: "textarea" },
    ],
  },
  {
    key: "progress",
    label: "Progress",
    prompt: "Track a metric that should trend up (or down) over time.",
    suggestedFields: [
      { key: "metric_name", label: "Metric", field_type: "text" },
      { key: "value", label: "Value", field_type: "number" },
      { key: "photos", label: "Photos", field_type: "photos" },
      { key: "mood", label: "Mood", field_type: "mood" },
      { key: "notes", label: "Notes", field_type: "textarea" },
    ],
  },
  {
    key: "goals",
    label: "Goals",
    prompt: "Members set a goal and log progress toward it.",
    suggestedFields: [
      { key: "goal", label: "Goal", field_type: "text" },
      { key: "target_date", label: "Target Date", field_type: "date" },
      { key: "progress_percent", label: "Progress %", field_type: "number" },
      { key: "status", label: "Status", field_type: "select", options: ["Not started", "In progress", "Done"] },
      { key: "notes", label: "Notes", field_type: "textarea" },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    prompt: "Ongoing work with tasks and status updates.",
    suggestedFields: [
      { key: "project_name", label: "Project Name", field_type: "text" },
      { key: "status", label: "Status", field_type: "select", options: ["Planning", "In progress", "Blocked", "Done"] },
      { key: "tasks_completed", label: "Tasks Completed", field_type: "checkbox" },
      { key: "files", label: "Files", field_type: "custom" },
      { key: "notes", label: "Notes", field_type: "textarea" },
    ],
  },
  {
    key: "plants",
    label: "Plants",
    prompt: "What's growing, and how it's doing.",
    suggestedFields: [
      { key: "photos", label: "Photos", field_type: "photos" },
      { key: "videos", label: "Videos", field_type: "videos" },
      { key: "crop", label: "Crop", field_type: "text" },
      { key: "variety", label: "Variety", field_type: "text" },
      { key: "date_planted", label: "Date Planted", field_type: "date" },
      { key: "harvest_date", label: "Harvest Date", field_type: "date" },
      { key: "weather", label: "Weather", field_type: "weather" },
      { key: "moon_phase", label: "Moon Phase", field_type: "moon_phase" },
      { key: "soil_type", label: "Soil Type", field_type: "text" },
      { key: "companion_plants", label: "Companion Plants", field_type: "text" },
      { key: "fertiliser", label: "Fertiliser", field_type: "text" },
      { key: "pests", label: "Pests", field_type: "text" },
      { key: "growth_stage", label: "Growth Stage", field_type: "select", options: ["Seed", "Seedling", "Vegetative", "Flowering", "Fruiting", "Harvested"] },
      { key: "location", label: "Location", field_type: "location" },
      { key: "mood", label: "Mood", field_type: "mood" },
      { key: "notes", label: "Notes", field_type: "textarea" },
    ],
  },
  {
    key: "animals",
    label: "Animals",
    prompt: "Livestock or pet health and care log.",
    suggestedFields: [
      { key: "species", label: "Species", field_type: "text" },
      { key: "name", label: "Name", field_type: "text" },
      { key: "weight", label: "Weight", field_type: "number" },
      { key: "feed", label: "Feed", field_type: "text" },
      { key: "vet_visit", label: "Vet Visit", field_type: "checkbox" },
      { key: "photos", label: "Photos", field_type: "photos" },
      { key: "notes", label: "Health Notes", field_type: "textarea" },
    ],
  },
  {
    key: "fitness",
    label: "Fitness",
    prompt: "Training, body metrics and how members feel.",
    suggestedFields: [
      { key: "weight", label: "Weight", field_type: "number" },
      { key: "workout", label: "Workout", field_type: "text" },
      { key: "calories", label: "Calories", field_type: "number" },
      { key: "sleep", label: "Sleep (hrs)", field_type: "number" },
      { key: "energy", label: "Energy", field_type: "rating" },
      { key: "mood", label: "Mood", field_type: "mood" },
      { key: "body_fat", label: "Body Fat %", field_type: "number" },
      { key: "progress_photos", label: "Progress Photos", field_type: "photos" },
      { key: "measurements", label: "Measurements", field_type: "custom" },
    ],
  },
  {
    key: "business",
    label: "Business",
    prompt: "Revenue, customers and wins for founders and operators.",
    suggestedFields: [
      { key: "revenue", label: "Revenue", field_type: "number" },
      { key: "customers", label: "Customers", field_type: "number" },
      { key: "wins", label: "Wins", field_type: "textarea" },
      { key: "challenges", label: "Challenges", field_type: "textarea" },
      { key: "tasks", label: "Tasks", field_type: "custom" },
      { key: "revenue_goal", label: "Revenue Goal", field_type: "number" },
    ],
  },
  {
    key: "health",
    label: "Health",
    prompt: "Symptoms, habits and how members are feeling.",
    suggestedFields: [
      { key: "symptoms", label: "Symptoms", field_type: "textarea" },
      { key: "sleep", label: "Sleep (hrs)", field_type: "number" },
      { key: "water_intake", label: "Water Intake", field_type: "number" },
      { key: "mood", label: "Mood", field_type: "mood" },
      { key: "medication_taken", label: "Medication Taken", field_type: "checkbox" },
      { key: "photos", label: "Photos", field_type: "photos" },
      { key: "notes", label: "Notes", field_type: "textarea" },
    ],
  },
  {
    key: "learning",
    label: "Learning",
    prompt: "What members studied and what stuck.",
    suggestedFields: [
      { key: "topic", label: "Topic", field_type: "text" },
      { key: "time_spent", label: "Time Spent (min)", field_type: "number" },
      { key: "key_takeaway", label: "Key Takeaway", field_type: "textarea" },
      { key: "confidence", label: "Confidence Level", field_type: "rating" },
      { key: "resources", label: "Resources", field_type: "text" },
      { key: "notes", label: "Notes", field_type: "textarea" },
    ],
  },
  {
    key: "spiritual_practice",
    label: "Spiritual Practice",
    prompt: "Prayer, meditation and reflection.",
    suggestedFields: [
      { key: "practice", label: "Practice", field_type: "select", options: ["Prayer", "Meditation", "Scripture study", "Reflection"] },
      { key: "duration", label: "Duration (min)", field_type: "number" },
      { key: "verse_or_quote", label: "Verse or Quote", field_type: "text" },
      { key: "gratitude", label: "Gratitude", field_type: "textarea" },
      { key: "mood", label: "Mood", field_type: "mood" },
      { key: "notes", label: "Notes", field_type: "textarea" },
    ],
  },
  {
    key: "gratitude",
    label: "Gratitude",
    prompt: "A daily practice of noticing what's good.",
    suggestedFields: [
      { key: "grateful_for", label: "Grateful For", field_type: "textarea" },
      { key: "mood", label: "Mood", field_type: "mood" },
      { key: "photos", label: "Photos", field_type: "photos" },
      { key: "tags", label: "Tags", field_type: "tags" },
    ],
  },
  {
    key: "custom",
    label: "Custom",
    prompt: "Start blank and build the exact fields you need.",
    suggestedFields: [],
  },
];

export function getJournalSubject(key: string): JournalSubject | undefined {
  return JOURNAL_SUBJECTS.find((s) => s.key === key);
}
