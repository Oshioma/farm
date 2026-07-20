# Community Builder — Implementation Plan

This adds a multi-tenant Community Builder (Circle/Skool/Mighty Networks-class) to the
existing farm app, under `/community`. It is fully additive: no existing farm tables,
routes, or pages were touched other than `middleware.ts` (added `/community` to the
protected-route list).

## Core architecture decision: everything is a Space

There is exactly one content model — `spaces` + `space_components` + `space_items` +
`space_comments` + `space_reactions`. A "Discussion," a "Marketplace," and a "Wiki" are
the same four tables with a different `space_type` and a different set of
`space_components`. Adding a 26th space type later means adding one entry to
`lib/community/catalog/spaceTypes.ts` — no migration, no new table, no new API route.

The two exceptions are **Journal** (needs typed field definitions members fill in on
every entry → `journal_field_defs`, entries still land in `space_items` as
`item_type = 'journal_entry'`) and **Growth Journey** (needs a fast per-member
timeline query → `member_timeline_events`, fanned out on write from journal entries,
posts, and completed challenges via `record_timeline_event()`).

Everything an admin can configure — profile fields, journal fields, component config,
challenge rules — is JSON/normalized data, not code branches. The rendering layer
switches on `space_type` in exactly one place (`app/community/[slug]/[spaceSlug]/page.tsx`).

## Database schema

`migrations/create_community_builder_schema.sql` — apply it via the Supabase SQL editor
or CLI, same as the other files in `migrations/`. Tables:

- `communities`, `community_membership_plans`, `community_members`
- `community_profile_field_defs`, `community_member_profile_values` (Profile Builder)
- `spaces`, `space_components` (Space Builder)
- `navigation_items` (Navigation Builder — supports groups/parents for grouped nav)
- `journal_field_defs` (Journal Builder)
- `space_items`, `space_comments`, `space_reactions` (generic content + engagement)
- `badges`, `challenges`, `challenge_participants`, `member_badges` (Challenge Builder)
- `member_timeline_events` (Growth Journey)

RLS is on every table. Two `SECURITY DEFINER` helpers (`is_community_member`,
`is_community_admin`) avoid the classic recursive-policy deadlock when a policy on
`community_members` needs to query `community_members`. `record_timeline_event()` is
a `SECURITY DEFINER` RPC so any member can log their own timeline events without a
broader write grant.

## Folder architecture

```
app/community/
  page.tsx                        "Your Communities" + Create CTA
  layout.tsx                      Manrope font wrapper
  new/                            Community Builder Wizard (5 steps, client state)
    page.tsx                      orchestrator (step index, WizardState)
    _lib/state.ts                 WizardState + template→state converters
    _steps/                       StepBasics, StepTemplate, StepCustomize,
                                   StepNavigation, StepLaunch, SpaceEditorCard,
                                   JournalFieldBuilder, WizardHeader
  [slug]/
    layout.tsx                    membership gate (join/request/pending/banned) + CommunityShell
    page.tsx                      community home (space grid + recent activity)
    _lib/                         CommunityContext, CommunityShell (sidebar/top/grouped nav)
    [spaceSlug]/
      page.tsx                    routes space_type -> the right view
      _views/                     PostsView, JournalView, DirectoryView,
                                   GrowthJourneyView, ChallengesView, LeaderboardView
    admin/
      layout.tsx                  owner/admin-only gate + AdminShell (bypasses the
                                   member layout's chrome — see comment in [slug]/layout.tsx)
      page.tsx                    dashboard
      spaces/, spaces/[spaceId]/journal/, navigation/, members/, challenges/,
      profile-fields/, directory/, journal-templates/, events/, marketplace/,
      courses/, automations/, analytics/, settings/
  _ui/primitives.tsx              Button, Card, Pill, EmptyState, IconTile

app/api/community/
  create/route.ts                 wizard finalize (server-side, service-role, all-or-nothing)
  ai-recommend/route.ts            AI Setup Flow recommendation endpoint
  slug-check/route.ts              URL availability

lib/community/
  types.ts                        one interface per table
  catalog/                        static, versioned config — the "no hard-coded
                                   features" layer:
    spaceTypes.ts                 26 space types: label/icon/default components
    components.ts                 25 reusable components: label/icon/default config
    communityTemplates.ts         17 templates (16 verticals + Custom), each with
                                   default spaces/profile fields/challenges/KB categories
    journalSubjects.ts            13 journal subjects with suggested fields
    aiSetup.ts                    rule-based recommendation engine (see below)
  communities.ts, members.ts, spaces.ts, navigation.ts, profileFields.ts,
  journal.ts, spaceItems.ts, challenges.ts, timeline.ts
                                   data access — direct Supabase calls guarded by RLS,
                                   matching the existing lib/farm.ts convention
  wizardTypes.ts                  shared request shape between the wizard UI and
                                   POST /api/community/create
  icon.tsx                        kebab-case string -> lucide-react component
```

## Component hierarchy (wizard, as the representative example)

```
NewCommunityPage (step state)
 ├─ WizardHeader (progress stepper)
 ├─ StepBasics            → name/slug/description/privacy/pricing/plans
 ├─ StepTemplate           → 17 template cards + AI transformation-goal box
 ├─ StepCustomize          → SpaceEditorCard[] (rename/duplicate/hide/delete/drag-reorder)
 │                            └─ JournalFieldBuilder (subject picker + field list, inline)
 ├─ StepNavigation         → nav style picker + drag-reorder + group assignment + live preview
 └─ StepLaunch             → review + POST /api/community/create
```

The admin dashboard reuses the identical pattern live against Supabase instead of
local state (`admin/spaces/page.tsx` is the persisted twin of `StepCustomize`).

## AI Community Setup flow

`lib/community/catalog/aiSetup.ts` exports `AiSetupEngine` (one method:
`recommend({ templateKey, transformationGoal }) -> SetupRecommendation`). The shipped
implementation, `ruleBasedAiSetupEngine`, is deterministic: it starts from the chosen
template's defaults, then layers a goal-specific overlay when the free-text
transformation goal matches a known pattern (Grow Food, Lose Weight, Build a Business,
Heal, Become Better Parents, Learn Photography, Get Fit, Learn Coding — extra spaces,
challenges, KB categories, leaderboard types per goal). This needs no API key and works
offline, and every field it produces is exactly the same shape Step 3/4 already edit —
so "everything is editable afterward" falls out of the wizard's existing state model
for free.

`POST /api/community/ai-recommend` is the seam: swap `ruleBasedAiSetupEngine` for an
LLM-backed implementation of the same interface later without touching the wizard UI.

## What's fully built and working end-to-end

- Wizard: all 5 steps, writes real rows across 8+ tables via one transactional-ish
  API call (rolls back the community on any failure).
- Space Builder: add/rename/duplicate/hide/delete/drag-reorder, both in the wizard
  and live in the admin dashboard.
- Journal Builder: subject picker seeds fields; unlimited custom fields; a live
  Journal space renders a dynamic form from `journal_field_defs` and lists entries.
- Navigation Builder: 4 nav styles (Sidebar / Top / Grouped / Collapsible Sections),
  drag-reorder, group assignment, live preview — both in the wizard and live in admin.
- Community Profile Builder + Directory Builder: admin defines fields, flags which are
  directory-visible/filterable; the Directory space does real search + filtering.
- Challenge Builder: name/description/duration/points/daily tasks; members join and
  complete challenges; points feed a real Leaderboard space.
- Growth Journey: per-member timeline fed by `record_timeline_event()` from journal
  entries, posts, and completed challenges, grouped by month; Annual Recap computed
  on demand from the same event log (streaks, top tags, most active month).
- File uploads: a public Supabase Storage bucket (`community-uploads`, RLS-scoped by
  uploader) backs a reusable drag-and-drop `FileUploader` component, wired into
  Journal photo/video fields (with real thumbnails in the entry list), post image
  attachments, community logo/banner (wizard + Settings), and member avatars +
  photo/gallery profile fields via a new "Edit Profile" page (`[slug]/profile`).
- Discussion-shaped spaces (discussion, blog, wiki, resources, Q&A, gallery, and every
  other type without a specialized view) get a working generic feed: post, comment,
  react.
- Admin dashboard: Dashboard, Spaces, Navigation, Members (role/ban), Challenges,
  Journal Templates, Profile Fields, Directory, Settings all read/write live data.
  Events/Marketplace/Courses are Space-type filtered views into the same Space
  Builder — intentional, since "everything is a Space" means they shouldn't be a
  second parallel system.
- Analytics shows real numbers (member count, content volume, per-space activity)
  computed from live tables — no mock data.
- Multi-tenant RLS on every table; role-based permissions (owner/admin/moderator/member)
  enforced in Postgres, not just in the UI.

## Known simplifications (roadmap, not placeholders)

- **File/photo/video upload** — journal and post forms accept a URL today; wiring
  Supabase Storage buckets + an upload widget is the next piece (`photo_upload`,
  `video_upload`, `file_upload` components already exist as config placeholders).
- **Payments** — `community_membership_plans` and paid privacy exist in schema and
  the wizard, but no checkout/billing provider is wired up yet.
- **Private community discoverability** — spec distinguishes "Private" (discoverable,
  content gated) from "Invite Only" (hidden). Current RLS treats both as hidden from
  non-members for simplicity; splitting this out is a small, isolated RLS change
  (a public "preview" select policy limited to name/description/logo).
- **Automations** — no rule engine yet. The event model it needs already exists
  (`member_timeline_events` + the generic `space_items` fan-out); the next step is a
  `automation_rules` table (trigger event_type -> action) and a dispatcher.
- **Public/mobile API** — all reads/writes currently go through the Supabase client
  directly (RLS-enforced) or the three Next.js API routes. A dedicated versioned
  `/api/v1/...` REST surface for mobile clients is straightforward to add on top of
  the same `lib/community/*` data-access functions, but hasn't been built.
- **Deep per-type specialization** — Marketplace listings, Events with RSVP, Courses
  with lesson progress, Livestreams, Podcasts, Forms, and Database currently render
  through the generic post feed rather than a bespoke UI. The schema (`space_items.data`
  jsonb + `space_components`) already supports building each of these as a focused
  follow-up without any schema migration.

## Running it

1. Apply `migrations/create_community_builder_schema.sql` in Supabase.
2. `npm run dev`, sign in, visit `/community`.
3. "Create Community" walks through the wizard; launching redirects to
   `/community/<slug>/admin`.
