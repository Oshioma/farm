import type { ProfileFieldType, SpaceType, SpaceVisibility } from "@/lib/community/types";

export interface TemplateSpaceDef {
  name: string;
  slug: string;
  icon: string;
  space_type: SpaceType;
  description: string;
  visibility?: SpaceVisibility;
  group_label?: string;
  /** For space_type "journal": seeds journal_field_defs from JOURNAL_SUBJECTS. */
  journalSubject?: string;
}

export interface TemplateProfileFieldDef {
  key: string;
  label: string;
  field_type: ProfileFieldType;
  options?: string[];
  show_in_directory?: boolean;
  filterable?: boolean;
}

export interface TemplateChallengeDef {
  name: string;
  description: string;
  duration_days: number;
  points: number;
  daily_tasks?: string[];
  weekly_tasks?: string[];
}

export interface CommunityTemplate {
  key: string;
  label: string;
  icon: string;
  tagline: string;
  description: string;
  defaultSpaces: TemplateSpaceDef[];
  defaultProfileFields: TemplateProfileFieldDef[];
  defaultChallenges: TemplateChallengeDef[];
  /** Categories shown when building this template's Knowledge Base / Resources space. */
  knowledgeBaseCategories: string[];
  leaderboardTypes: string[];
}

// Every field a member profile could reasonably carry, shared across templates
// so the Directory and member cards look consistent before admins customize.
const BASE_PROFILE_FIELDS: TemplateProfileFieldDef[] = [
  { key: "location", label: "Location", field_type: "location", show_in_directory: true, filterable: true },
  { key: "website", label: "Website", field_type: "website" },
  { key: "social_links", label: "Social Links", field_type: "social_links" },
  { key: "interests", label: "Interests", field_type: "interests", show_in_directory: true, filterable: true },
];

const withBase = (...extra: TemplateProfileFieldDef[]): TemplateProfileFieldDef[] => [...BASE_PROFILE_FIELDS, ...extra];

export const COMMUNITY_TEMPLATES: CommunityTemplate[] = [
  {
    key: "learning",
    label: "Learning",
    icon: "graduation-cap",
    tagline: "Courses, study groups and live classes",
    description: "For educators building a structured learning community around one or more courses.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation and questions." },
      { name: "Courses", slug: "courses", icon: "graduation-cap", space_type: "courses", description: "Structured lessons members work through." },
      { name: "Study Groups", slug: "study-groups", icon: "users", space_type: "chat", description: "Small cohorts studying together." },
      { name: "Learning Journal", slug: "learning-journal", icon: "notebook-pen", space_type: "journal", description: "Log what you studied and what stuck.", journalSubject: "learning" },
      { name: "Live Classes", slug: "live-classes", icon: "calendar-days", space_type: "events", description: "Upcoming live sessions and replays." },
      { name: "Q&A", slug: "qa", icon: "help-circle", space_type: "qa", description: "Ask questions, upvote the best answers." },
      { name: "Resources", slug: "resources", icon: "library", space_type: "resources", description: "Reading lists, templates and downloads." },
      { name: "Member Directory", slug: "members", icon: "users", space_type: "directory", description: "Find and connect with other learners." },
    ],
    defaultProfileFields: withBase(
      { key: "experience_level", label: "Experience Level", field_type: "experience_level", show_in_directory: true, filterable: true },
      { key: "skills", label: "Skills", field_type: "skills", show_in_directory: true, filterable: true }
    ),
    defaultChallenges: [
      { name: "7-Day Study Streak", description: "Log a learning entry every day for a week.", duration_days: 7, points: 100, daily_tasks: ["Log a learning journal entry"] },
    ],
    knowledgeBaseCategories: ["Getting Started", "Course Materials", "Study Tips", "FAQs"],
    leaderboardTypes: ["Study streak", "Lessons completed"],
  },
  {
    key: "business",
    label: "Business",
    icon: "briefcase",
    tagline: "Peer accountability for operators and founders",
    description: "For consultants, agencies and operator communities trading tactics and accountability.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Wins & Challenges", slug: "wins-challenges", icon: "notebook-pen", space_type: "journal", description: "Log revenue, wins and blockers.", journalSubject: "business" },
      { name: "Accountability Goals", slug: "goals", icon: "target", space_type: "goals", description: "Set and track quarterly goals." },
      { name: "Mastermind Chat", slug: "mastermind", icon: "messages-square", space_type: "chat", description: "Small-group real-time discussion." },
      { name: "Events", slug: "events", icon: "calendar-days", space_type: "events", description: "Workshops and office hours." },
      { name: "Marketplace", slug: "marketplace", icon: "store", space_type: "marketplace", description: "Members offer services to each other." },
      { name: "Knowledge Base", slug: "knowledge-base", icon: "book-open", space_type: "wiki", description: "Playbooks and frameworks." },
      { name: "Member Directory", slug: "members", icon: "users", space_type: "directory", description: "Find members by industry and skill." },
    ],
    defaultProfileFields: withBase(
      { key: "experience_level", label: "Experience Level", field_type: "experience_level", show_in_directory: true, filterable: true },
      { key: "can_help_with", label: "Can Help With", field_type: "can_help_with", show_in_directory: true, filterable: true },
      { key: "needs_help_with", label: "Needs Help With", field_type: "needs_help_with", show_in_directory: true, filterable: true }
    ),
    defaultChallenges: [
      { name: "90-Day Revenue Sprint", description: "Log business metrics weekly and hit your revenue goal.", duration_days: 90, points: 500, weekly_tasks: ["Log revenue and customers"] },
    ],
    knowledgeBaseCategories: ["Sales", "Marketing", "Operations", "Finance"],
    leaderboardTypes: ["Revenue growth", "Goals completed"],
  },
  {
    key: "coaching",
    label: "Coaching",
    icon: "compass",
    tagline: "Client journals, sessions and accountability",
    description: "For coaches running group programs with structured check-ins.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Client Journal", slug: "client-journal", icon: "notebook-pen", space_type: "journal", description: "Weekly reflections and progress.", journalSubject: "goals" },
      { name: "Goals & Accountability", slug: "goals", icon: "target", space_type: "goals", description: "Track goals set with your coach." },
      { name: "1:1 Sessions", slug: "sessions", icon: "calendar", space_type: "calendar", description: "Book and track coaching sessions." },
      { name: "Wins Wall", slug: "wins", icon: "sparkles", space_type: "timeline", description: "Celebrate client breakthroughs." },
      { name: "Challenges", slug: "challenges", icon: "flag", space_type: "challenges", description: "Time-boxed programs to build momentum." },
      { name: "Resources", slug: "resources", icon: "library", space_type: "resources", description: "Worksheets and frameworks." },
      { name: "Q&A", slug: "qa", icon: "help-circle", space_type: "qa", description: "Ask your coach anything." },
    ],
    defaultProfileFields: withBase(
      { key: "experience_level", label: "Experience Level", field_type: "experience_level", show_in_directory: true, filterable: true }
    ),
    defaultChallenges: [
      { name: "30-Day Momentum Challenge", description: "Complete a daily action toward your goal for 30 days.", duration_days: 30, points: 300, daily_tasks: ["Complete today's action step"] },
    ],
    knowledgeBaseCategories: ["Frameworks", "Worksheets", "Session Recordings"],
    leaderboardTypes: ["Goal completion", "Session attendance"],
  },
  {
    key: "course",
    label: "Course",
    icon: "monitor-play",
    tagline: "A single cohort-based course community",
    description: "For a single flagship course with cohorts, assignments and certificates.",
    defaultSpaces: [
      { name: "Announcements", slug: "announcements", icon: "pen-line", space_type: "blog", description: "Updates from the instructor." },
      { name: "Curriculum", slug: "curriculum", icon: "graduation-cap", space_type: "courses", description: "Lessons in order, with progress tracking." },
      { name: "Assignments", slug: "assignments", icon: "clipboard-list", space_type: "forms", description: "Submit and review assignments." },
      { name: "Cohort Chat", slug: "cohort-chat", icon: "messages-square", space_type: "chat", description: "Talk with your cohort in real time." },
      { name: "Q&A", slug: "qa", icon: "help-circle", space_type: "qa", description: "Ask questions about the material." },
      { name: "Certificates", slug: "certificates", icon: "award", space_type: "progress_tracker", description: "Track completion toward your certificate." },
      { name: "Resources", slug: "resources", icon: "library", space_type: "resources", description: "Slides, templates and extra reading." },
    ],
    defaultProfileFields: withBase(
      { key: "experience_level", label: "Experience Level", field_type: "experience_level", show_in_directory: true, filterable: true }
    ),
    defaultChallenges: [
      { name: "Finish the Course", description: "Complete every lesson before the cohort ends.", duration_days: 45, points: 400 },
    ],
    knowledgeBaseCategories: ["Lesson Notes", "Templates", "Bonus Material"],
    leaderboardTypes: ["Lessons completed", "Assignment score"],
  },
  {
    key: "creator",
    label: "Creator",
    icon: "clapperboard",
    tagline: "Posts, livestreams and courses for your audience",
    description: "For creators turning an audience into a paid membership community.",
    defaultSpaces: [
      { name: "Posts", slug: "posts", icon: "message-square", space_type: "discussion", description: "Everything you share with members." },
      { name: "Livestreams", slug: "livestreams", icon: "video", space_type: "livestreams", description: "Live and replayed sessions." },
      { name: "Courses", slug: "courses", icon: "graduation-cap", space_type: "courses", description: "Premium lessons for members." },
      { name: "Podcast", slug: "podcast", icon: "mic", space_type: "podcasts", description: "Members-only episodes." },
      { name: "Files", slug: "files", icon: "folder", space_type: "files", description: "Downloads and templates." },
      { name: "Community Chat", slug: "chat", icon: "messages-square", space_type: "chat", description: "Real-time hangout for members." },
      { name: "Q&A", slug: "qa", icon: "help-circle", space_type: "qa", description: "Ask me anything." },
      { name: "Events", slug: "events", icon: "calendar-days", space_type: "events", description: "AMAs, watch parties and meetups." },
    ],
    defaultProfileFields: withBase(
      { key: "skills", label: "Skills", field_type: "skills", show_in_directory: true, filterable: true }
    ),
    defaultChallenges: [
      { name: "30 Days of Content", description: "Post something in the community every day for 30 days.", duration_days: 30, points: 300, daily_tasks: ["Share a post"] },
    ],
    knowledgeBaseCategories: ["Behind the Scenes", "Tutorials", "FAQs"],
    leaderboardTypes: ["Most active", "Top contributor"],
  },
  {
    key: "fitness",
    label: "Fitness",
    icon: "dumbbell",
    tagline: "Workouts, habits and leaderboards",
    description: "For trainers and fitness communities driving daily consistency.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Workout Journal", slug: "workout-journal", icon: "notebook-pen", space_type: "journal", description: "Log every session.", journalSubject: "fitness" },
      { name: "Habit Tracker", slug: "habit-tracker", icon: "trending-up", space_type: "progress_tracker", description: "Daily habits that compound." },
      { name: "Nutrition Diary", slug: "nutrition", icon: "notebook-pen", space_type: "journal", description: "Log meals and macros.", journalSubject: "health" },
      { name: "Challenges", slug: "challenges", icon: "flag", space_type: "challenges", description: "Time-boxed fitness programs." },
      { name: "Leaderboard", slug: "leaderboard", icon: "trophy", space_type: "leaderboard", description: "Top performers this month." },
      { name: "Events", slug: "events", icon: "calendar-days", space_type: "events", description: "Group workouts and competitions." },
    ],
    defaultProfileFields: withBase(
      { key: "experience_level", label: "Experience Level", field_type: "experience_level", show_in_directory: true, filterable: true }
    ),
    defaultChallenges: [
      { name: "30-Day Fitness Kickstart", description: "Log a workout every day for 30 days.", duration_days: 30, points: 300, daily_tasks: ["Log today's workout"] },
    ],
    knowledgeBaseCategories: ["Workout Plans", "Nutrition Guides", "Recovery"],
    leaderboardTypes: ["Workout streak", "Total workouts", "Challenge points"],
  },
  {
    key: "faith",
    label: "Faith",
    icon: "church",
    tagline: "Devotionals, prayer and small groups",
    description: "For churches and faith communities staying connected between gatherings.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Daily Devotional", slug: "devotional", icon: "notebook-pen", space_type: "journal", description: "Reflections on scripture and prayer.", journalSubject: "spiritual_practice" },
      { name: "Prayer Requests", slug: "prayer-requests", icon: "help-circle", space_type: "qa", description: "Share and pray for each other." },
      { name: "Small Groups", slug: "small-groups", icon: "messages-square", space_type: "chat", description: "Stay connected with your group." },
      { name: "Events", slug: "events", icon: "calendar-days", space_type: "events", description: "Services, retreats and gatherings." },
      { name: "Bible Study Library", slug: "bible-study", icon: "book-open", space_type: "wiki", description: "Studies and teaching notes." },
      { name: "Testimonies", slug: "testimonies", icon: "sparkles", space_type: "timeline", description: "Stories of faith in action." },
    ],
    defaultProfileFields: BASE_PROFILE_FIELDS,
    defaultChallenges: [
      { name: "21-Day Prayer Challenge", description: "Log a devotional entry every day for 21 days.", duration_days: 21, points: 210, daily_tasks: ["Log a devotional entry"] },
    ],
    knowledgeBaseCategories: ["Bible Studies", "Sermon Notes", "Prayer Guides"],
    leaderboardTypes: ["Devotional streak"],
  },
  {
    key: "local",
    label: "Local",
    icon: "map-pin",
    tagline: "Neighborhood announcements and events",
    description: "For neighborhoods, towns and local interest groups.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Announcements", slug: "announcements", icon: "pen-line", space_type: "blog", description: "Official updates." },
      { name: "Events", slug: "events", icon: "calendar-days", space_type: "events", description: "Local meetups and gatherings." },
      { name: "Local Directory", slug: "directory", icon: "users", space_type: "directory", description: "Find neighbors nearby." },
      { name: "Marketplace", slug: "marketplace", icon: "store", space_type: "marketplace", description: "Buy, sell and give away locally." },
      { name: "Volunteer Opportunities", slug: "volunteer", icon: "clipboard-list", space_type: "forms", description: "Sign up to help out." },
      { name: "Resources", slug: "resources", icon: "library", space_type: "resources", description: "Local services and contacts." },
    ],
    defaultProfileFields: withBase(
      { key: "can_help_with", label: "Can Help With", field_type: "can_help_with", show_in_directory: true, filterable: true }
    ),
    defaultChallenges: [],
    knowledgeBaseCategories: ["Local Services", "Emergency Contacts", "Community Guidelines"],
    leaderboardTypes: ["Most helpful neighbor"],
  },
  {
    key: "farming",
    label: "Farming",
    icon: "sprout",
    tagline: "Crops, journals and seasonal knowledge",
    description: "For growers tracking crops, sharing harvests and helping each other through the seasons.",
    defaultSpaces: [
      { name: "Discussion Feed", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Growing Journey", slug: "growing-journey", icon: "sprout", space_type: "growth_journey", description: "Every grower's personal timeline." },
      { name: "Farm Journal", slug: "farm-journal", icon: "notebook-pen", space_type: "journal", description: "Log plantings, harvests and conditions.", journalSubject: "plants" },
      { name: "Crop Library", slug: "crop-library", icon: "book-open", space_type: "wiki", description: "Reference guides by crop." },
      { name: "Challenges", slug: "challenges", icon: "flag", space_type: "challenges", description: "Seasonal growing challenges." },
      { name: "Events", slug: "events", icon: "calendar-days", space_type: "events", description: "Workshops, swaps and markets." },
      { name: "Resources", slug: "resources", icon: "library", space_type: "resources", description: "Guides, tools and suppliers." },
      { name: "Marketplace", slug: "marketplace", icon: "store", space_type: "marketplace", description: "Trade produce, seeds and tools." },
      { name: "Ask for Help", slug: "ask-for-help", icon: "help-circle", space_type: "qa", description: "Get advice from experienced growers." },
      { name: "Member Directory", slug: "members", icon: "users", space_type: "directory", description: "Find growers near you." },
      { name: "Seasonal Calendar", slug: "seasonal-calendar", icon: "calendar", space_type: "calendar", description: "Planting and harvest windows." },
      { name: "Knowledge Base", slug: "knowledge-base", icon: "book-open", space_type: "wiki", description: "Farming best practices." },
    ],
    defaultProfileFields: withBase(
      { key: "experience_level", label: "Experience Level", field_type: "experience_level", show_in_directory: true, filterable: true },
      { key: "can_help_with", label: "Can Help With", field_type: "can_help_with", show_in_directory: true, filterable: true },
      { key: "needs_help_with", label: "Needs Help With", field_type: "needs_help_with", show_in_directory: true, filterable: true }
    ),
    defaultChallenges: [
      { name: "Grow Your First Bed", description: "Plant, tend and harvest one bed from seed to table.", duration_days: 90, points: 400, weekly_tasks: ["Log a farm journal entry"] },
    ],
    knowledgeBaseCategories: ["Soil & Composting", "Pest Management", "Planting Calendars", "Harvest & Storage"],
    leaderboardTypes: ["Journal streak", "Harvests logged", "Members helped"],
  },
  {
    key: "wellness",
    label: "Wellness",
    icon: "heart-pulse",
    tagline: "Habits, journaling and mindful challenges",
    description: "For wellness practitioners guiding members toward healthier daily habits.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Wellness Journal", slug: "wellness-journal", icon: "notebook-pen", space_type: "journal", description: "Track how you're feeling.", journalSubject: "health" },
      { name: "Habit Tracker", slug: "habit-tracker", icon: "trending-up", space_type: "progress_tracker", description: "Daily habits and streaks." },
      { name: "Challenges", slug: "challenges", icon: "flag", space_type: "challenges", description: "Guided wellness challenges." },
      { name: "Events", slug: "events", icon: "calendar-days", space_type: "events", description: "Classes and group sessions." },
      { name: "Resources", slug: "resources", icon: "library", space_type: "resources", description: "Guided practices and reading." },
      { name: "Member Directory", slug: "members", icon: "users", space_type: "directory", description: "Find your accountability partner." },
    ],
    defaultProfileFields: BASE_PROFILE_FIELDS,
    defaultChallenges: [
      { name: "21-Day Gratitude Challenge", description: "Log one thing you're grateful for every day.", duration_days: 21, points: 210, daily_tasks: ["Log a gratitude entry"] },
    ],
    knowledgeBaseCategories: ["Mindfulness", "Sleep", "Nutrition"],
    leaderboardTypes: ["Habit streak"],
  },
  {
    key: "photography",
    label: "Photography",
    icon: "camera",
    tagline: "Galleries, critique and challenges",
    description: "For photographers sharing work, getting feedback and improving together.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Photo Gallery", slug: "gallery", icon: "images", space_type: "gallery", description: "Share your latest shots." },
      { name: "Critique Requests", slug: "critique", icon: "help-circle", space_type: "qa", description: "Get feedback on your work." },
      { name: "Challenges", slug: "challenges", icon: "flag", space_type: "challenges", description: "Weekly photo prompts." },
      { name: "Resources", slug: "resources", icon: "library", space_type: "resources", description: "Tutorials, presets and gear guides." },
      { name: "Marketplace", slug: "marketplace", icon: "store", space_type: "marketplace", description: "Sell prints and presets." },
      { name: "Events", slug: "events", icon: "calendar-days", space_type: "events", description: "Photo walks and meetups." },
      { name: "Member Directory", slug: "members", icon: "users", space_type: "directory", description: "Browse portfolios by style." },
    ],
    defaultProfileFields: withBase(
      { key: "skills", label: "Gear & Style", field_type: "skills", show_in_directory: true, filterable: true },
      { key: "gallery", label: "Portfolio", field_type: "gallery" }
    ),
    defaultChallenges: [
      { name: "52-Week Photo Challenge", description: "Post one photo to a weekly prompt.", duration_days: 365, points: 520, weekly_tasks: ["Post to this week's prompt"] },
    ],
    knowledgeBaseCategories: ["Camera Settings", "Editing", "Composition"],
    leaderboardTypes: ["Challenge streak", "Most critiqued"],
  },
  {
    key: "nonprofit",
    label: "Non-profit",
    icon: "hand-heart",
    tagline: "Volunteers, donations and impact",
    description: "For non-profits organizing volunteers and reporting impact to supporters.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Announcements", slug: "announcements", icon: "pen-line", space_type: "blog", description: "Updates from the organization." },
      { name: "Volunteer Directory", slug: "volunteers", icon: "users", space_type: "directory", description: "Find volunteers by skill and availability." },
      { name: "Events", slug: "events", icon: "calendar-days", space_type: "events", description: "Volunteer days and fundraisers." },
      { name: "Donations", slug: "donations", icon: "heart-handshake", space_type: "donations", description: "Track fundraising campaigns." },
      { name: "Impact Journal", slug: "impact-journal", icon: "notebook-pen", space_type: "journal", description: "Log outcomes and stories.", journalSubject: "business" },
      { name: "Knowledge Base", slug: "knowledge-base", icon: "book-open", space_type: "wiki", description: "Volunteer handbook and policies." },
    ],
    defaultProfileFields: withBase(
      { key: "can_help_with", label: "Can Help With", field_type: "can_help_with", show_in_directory: true, filterable: true },
      { key: "experience_level", label: "Experience Level", field_type: "experience_level", filterable: true }
    ),
    defaultChallenges: [],
    knowledgeBaseCategories: ["Volunteer Handbook", "Safety", "Impact Reports"],
    leaderboardTypes: ["Volunteer hours", "Funds raised"],
  },
  {
    key: "networking",
    label: "Networking",
    icon: "network",
    tagline: "Introductions, directory and job board",
    description: "For professional communities focused on making connections.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Introductions", slug: "introductions", icon: "message-square", space_type: "discussion", description: "New members introduce themselves." },
      { name: "Member Directory", slug: "members", icon: "users", space_type: "directory", description: "Search by industry, role and skill." },
      { name: "Job Board", slug: "job-board", icon: "store", space_type: "marketplace", description: "Post and browse opportunities." },
      { name: "Events", slug: "events", icon: "calendar-days", space_type: "events", description: "Mixers and networking events." },
      { name: "Mastermind Chat", slug: "mastermind", icon: "messages-square", space_type: "chat", description: "Small-group discussion." },
      { name: "Resources", slug: "resources", icon: "library", space_type: "resources", description: "Guides and templates." },
    ],
    defaultProfileFields: withBase(
      { key: "experience_level", label: "Experience Level", field_type: "experience_level", show_in_directory: true, filterable: true },
      { key: "skills", label: "Skills", field_type: "skills", show_in_directory: true, filterable: true },
      { key: "can_help_with", label: "Can Help With", field_type: "can_help_with", show_in_directory: true, filterable: true },
      { key: "needs_help_with", label: "Needs Help With", field_type: "needs_help_with", show_in_directory: true, filterable: true }
    ),
    defaultChallenges: [],
    knowledgeBaseCategories: ["Networking Tips", "Industry Guides"],
    leaderboardTypes: ["Most connected", "Most helpful"],
  },
  {
    key: "gaming",
    label: "Gaming",
    icon: "gamepad-2",
    tagline: "Chat, tournaments and leaderboards",
    description: "For gaming communities and clans organizing around play.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Community Chat", slug: "chat", icon: "messages-square", space_type: "chat", description: "Real-time hangout." },
      { name: "Tournaments", slug: "tournaments", icon: "calendar-days", space_type: "events", description: "Upcoming and past tournaments." },
      { name: "Leaderboard", slug: "leaderboard", icon: "trophy", space_type: "leaderboard", description: "Top ranked players." },
      { name: "Clips & Highlights", slug: "clips", icon: "images", space_type: "gallery", description: "Share your best plays." },
      { name: "Guides", slug: "guides", icon: "book-open", space_type: "wiki", description: "Strategy and build guides." },
      { name: "Team Finder", slug: "team-finder", icon: "users", space_type: "directory", description: "Find teammates by game and role." },
      { name: "Challenges", slug: "challenges", icon: "flag", space_type: "challenges", description: "Seasonal ranking challenges." },
    ],
    defaultProfileFields: withBase(
      { key: "skills", label: "Games & Roles", field_type: "skills", show_in_directory: true, filterable: true },
      { key: "experience_level", label: "Rank / Experience", field_type: "experience_level", show_in_directory: true, filterable: true }
    ),
    defaultChallenges: [
      { name: "Season Ranked Climb", description: "Log matches and climb the leaderboard this season.", duration_days: 60, points: 600 },
    ],
    knowledgeBaseCategories: ["Strategy Guides", "Patch Notes", "Rules"],
    leaderboardTypes: ["Rank", "Wins", "Tournament points"],
  },
  {
    key: "startup",
    label: "Startup",
    icon: "rocket",
    tagline: "Founder journals and peer support",
    description: "For founder communities and accelerators tracking building-in-public progress.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Founder Journal", slug: "founder-journal", icon: "notebook-pen", space_type: "journal", description: "Log metrics and milestones.", journalSubject: "business" },
      { name: "Mastermind Chat", slug: "mastermind", icon: "messages-square", space_type: "chat", description: "Small-group discussion." },
      { name: "Pitch Practice", slug: "pitch-practice", icon: "help-circle", space_type: "qa", description: "Get feedback on your pitch." },
      { name: "Events", slug: "events", icon: "calendar-days", space_type: "events", description: "Demo days and office hours." },
      { name: "Job Board", slug: "job-board", icon: "store", space_type: "marketplace", description: "Hire and get hired." },
      { name: "Resources", slug: "resources", icon: "library", space_type: "resources", description: "Templates, decks and playbooks." },
      { name: "Member Directory", slug: "members", icon: "users", space_type: "directory", description: "Find co-founders and advisors." },
    ],
    defaultProfileFields: withBase(
      { key: "skills", label: "Skills", field_type: "skills", show_in_directory: true, filterable: true },
      { key: "can_help_with", label: "Can Help With", field_type: "can_help_with", show_in_directory: true, filterable: true },
      { key: "needs_help_with", label: "Needs Help With", field_type: "needs_help_with", show_in_directory: true, filterable: true }
    ),
    defaultChallenges: [
      { name: "Build in Public: 90 Days", description: "Post a weekly update on your progress.", duration_days: 90, points: 450, weekly_tasks: ["Log a founder journal entry"] },
    ],
    knowledgeBaseCategories: ["Fundraising", "Product", "Growth", "Legal"],
    leaderboardTypes: ["Update streak", "Milestones hit"],
  },
  {
    key: "book_club",
    label: "Book Club",
    icon: "book-marked",
    tagline: "Reading logs, discussion and meetups",
    description: "For book clubs and reading communities discussing what they're reading.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation." },
      { name: "Current Read", slug: "current-read", icon: "pen-line", space_type: "blog", description: "This cycle's book and schedule." },
      { name: "Reading Log", slug: "reading-log", icon: "notebook-pen", space_type: "journal", description: "Track what you're reading.", journalSubject: "learning" },
      { name: "Book Library", slug: "library", icon: "book-open", space_type: "wiki", description: "Past reads and notes." },
      { name: "Meetups", slug: "meetups", icon: "calendar-days", space_type: "events", description: "Discussion meetups." },
      { name: "Vote on Next Book", slug: "vote", icon: "bar-chart-3", space_type: "polls", description: "Pick what the club reads next." },
      { name: "Member Directory", slug: "members", icon: "users", space_type: "directory", description: "Find members by favorite genres." },
    ],
    defaultProfileFields: withBase(
      { key: "interests", label: "Favorite Genres", field_type: "interests", show_in_directory: true, filterable: true }
    ),
    defaultChallenges: [
      { name: "Read 12 Books This Year", description: "Log one finished book a month.", duration_days: 365, points: 240 },
    ],
    knowledgeBaseCategories: ["Reading Lists", "Author Spotlights", "Discussion Guides"],
    leaderboardTypes: ["Books finished"],
  },
  {
    key: "custom",
    label: "Custom",
    icon: "sparkles",
    tagline: "Start blank and build it your way",
    description: "No preset spaces — pick exactly what your community needs from the Space Builder.",
    defaultSpaces: [
      { name: "Discussion", slug: "discussion", icon: "message-square", space_type: "discussion", description: "General conversation to start the community off." },
    ],
    defaultProfileFields: BASE_PROFILE_FIELDS,
    defaultChallenges: [],
    knowledgeBaseCategories: [],
    leaderboardTypes: [],
  },
];

export function getCommunityTemplate(key: string): CommunityTemplate | undefined {
  return COMMUNITY_TEMPLATES.find((t) => t.key === key);
}
