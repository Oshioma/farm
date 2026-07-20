import {
  COMMUNITY_TEMPLATES,
  getCommunityTemplate,
  type TemplateChallengeDef,
  type TemplateProfileFieldDef,
  type TemplateSpaceDef,
} from "@/lib/community/catalog/communityTemplates";
import type { NavStyle } from "@/lib/community/types";

export interface SetupRecommendation {
  spaces: TemplateSpaceDef[];
  profileFields: TemplateProfileFieldDef[];
  challenges: TemplateChallengeDef[];
  navStyle: NavStyle;
  directoryFilters: string[];
  leaderboardTypes: string[];
  knowledgeBaseCategories: string[];
  rationale: string[];
}

export interface AiSetupInput {
  templateKey: string;
  transformationGoal: string;
}

// Swappable seam: today this is a deterministic rule engine so setup works with
// zero external dependencies or API keys. A future LLM-backed implementation
// (e.g. OpenAiSetupEngine) can implement the same interface and be swapped in
// at the call site in app/api/community/ai-recommend/route.ts without touching
// the wizard UI.
export interface AiSetupEngine {
  recommend(input: AiSetupInput): SetupRecommendation;
}

export const TRANSFORMATION_GOAL_PRESETS = [
  "Grow Food",
  "Lose Weight",
  "Build a Business",
  "Heal",
  "Become Better Parents",
  "Learn Photography",
  "Get Fit",
  "Learn Coding",
] as const;

interface GoalOverlay {
  match: RegExp;
  templateHint?: string;
  extraSpaces?: TemplateSpaceDef[];
  extraProfileFields?: TemplateProfileFieldDef[];
  extraChallenges?: TemplateChallengeDef[];
  extraKnowledgeBase?: string[];
  extraLeaderboardTypes?: string[];
}

const GOAL_OVERLAYS: GoalOverlay[] = [
  {
    match: /grow food|garden|homestead/i,
    templateHint: "farming",
    extraChallenges: [
      { name: "Seed to Harvest", description: "Take one crop from planting to harvest and log every stage.", duration_days: 90, points: 350, weekly_tasks: ["Log a farm journal entry"] },
    ],
    extraKnowledgeBase: ["Beginner Growing Guides"],
    extraLeaderboardTypes: ["Harvests logged"],
  },
  {
    match: /lose weight|weight loss|shed pounds/i,
    templateHint: "fitness",
    extraSpaces: [
      { name: "Weigh-In Tracker", slug: "weigh-ins", icon: "trending-up", space_type: "progress_tracker", description: "Weekly weigh-ins and trend line." },
    ],
    extraChallenges: [
      { name: "12-Week Weight Loss Challenge", description: "Log weight and workouts weekly toward your goal.", duration_days: 84, points: 500, weekly_tasks: ["Log weigh-in and workouts"] },
    ],
    extraLeaderboardTypes: ["Weight lost", "Workout streak"],
  },
  {
    match: /build a business|start a business|entrepreneur/i,
    templateHint: "business",
    extraChallenges: [
      { name: "First 10 Customers", description: "Log outreach and wins until you land 10 paying customers.", duration_days: 60, points: 400 },
    ],
    extraKnowledgeBase: ["Getting Your First Customers"],
    extraLeaderboardTypes: ["Customers acquired"],
  },
  {
    match: /heal|recovery|therapy|grief/i,
    templateHint: "wellness",
    extraSpaces: [
      { name: "Support Circle", slug: "support-circle", icon: "messages-square", space_type: "chat", description: "A safe, small group to check in with." },
    ],
    extraChallenges: [
      { name: "30 Days of Check-Ins", description: "Log how you're feeling every day for 30 days.", duration_days: 30, points: 300, daily_tasks: ["Log a wellness journal entry"] },
    ],
  },
  {
    match: /better parent|parenting/i,
    templateHint: "wellness",
    extraSpaces: [
      { name: "Parenting Discussion", slug: "parenting-discussion", icon: "message-square", space_type: "discussion", description: "Ask questions and share what's working." },
    ],
    extraKnowledgeBase: ["Age-by-Age Guides", "Difficult Conversations"],
  },
  {
    match: /photograph|photo/i,
    templateHint: "photography",
    extraChallenges: [
      { name: "30-Day Photo Challenge", description: "Post one photo a day to a daily prompt.", duration_days: 30, points: 300, daily_tasks: ["Post today's photo"] },
    ],
  },
  {
    match: /get fit|fitness|strength|muscle/i,
    templateHint: "fitness",
    extraLeaderboardTypes: ["Workout streak", "PRs set"],
  },
  {
    match: /learn cod(e|ing)|programming|developer|software/i,
    templateHint: "learning",
    extraSpaces: [
      { name: "Pair Programming", slug: "pair-programming", icon: "messages-square", space_type: "chat", description: "Find a partner to build with." },
      { name: "Code Review", slug: "code-review", icon: "help-circle", space_type: "qa", description: "Get feedback on your code." },
    ],
    extraChallenges: [
      { name: "100 Days of Code", description: "Log at least 30 minutes of coding practice every day.", duration_days: 100, points: 500, daily_tasks: ["Log a learning journal entry"] },
    ],
    extraKnowledgeBase: ["Setup Guides", "Interview Prep"],
    extraLeaderboardTypes: ["Coding streak", "Projects shipped"],
  },
];

function dedupeBySlug<T extends { slug: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });
}

function dedupeByKey<T extends { key: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
}

export const ruleBasedAiSetupEngine: AiSetupEngine = {
  recommend({ templateKey, transformationGoal }: AiSetupInput): SetupRecommendation {
    const overlay = GOAL_OVERLAYS.find((o) => o.match.test(transformationGoal));
    const effectiveTemplateKey = templateKey === "custom" && overlay?.templateHint ? overlay.templateHint : templateKey;
    const template = getCommunityTemplate(effectiveTemplateKey) ?? getCommunityTemplate("custom")!;

    const rationale: string[] = [
      `Started from the ${template.label} template's proven space list.`,
    ];

    if (overlay) {
      rationale.push(`Adjusted the setup for the goal "${transformationGoal}".`);
    } else if (transformationGoal.trim()) {
      rationale.push(`No exact match for "${transformationGoal}" — kept the ${template.label} defaults, which cover most of it.`);
    }

    const spaces = dedupeBySlug([...template.defaultSpaces, ...(overlay?.extraSpaces ?? [])]);
    const profileFields = dedupeByKey([...template.defaultProfileFields, ...(overlay?.extraProfileFields ?? [])]);
    const challenges = [...template.defaultChallenges, ...(overlay?.extraChallenges ?? [])];
    const knowledgeBaseCategories = Array.from(new Set([...template.knowledgeBaseCategories, ...(overlay?.extraKnowledgeBase ?? [])]));
    const leaderboardTypes = Array.from(new Set([...template.leaderboardTypes, ...(overlay?.extraLeaderboardTypes ?? [])]));
    const directoryFilters = profileFields.filter((f) => f.filterable).map((f) => f.key);

    const navStyle: NavStyle = spaces.length > 8 ? "grouped_sidebar" : "sidebar";

    return { spaces, profileFields, challenges, navStyle, directoryFilters, leaderboardTypes, knowledgeBaseCategories, rationale };
  },
};

export const ALL_TEMPLATE_KEYS = COMMUNITY_TEMPLATES.map((t) => t.key);
