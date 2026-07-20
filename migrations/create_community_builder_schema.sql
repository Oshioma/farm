-- Community Builder: core multi-tenant schema.
-- Every "feature" is a Space made of reusable components — no space type gets its
-- own table. Structured content (posts, journal entries, milestones) lives in the
-- generic space_items table; per-community configuration (profile fields, journal
-- fields, navigation) is normalized so new Space Types never require a migration.

-- ============================================================================
-- COMMUNITIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'invite_only')),
  pricing_type TEXT NOT NULL DEFAULT 'free' CHECK (pricing_type IN ('free', 'paid')),
  template_key TEXT NOT NULL DEFAULT 'custom',
  transformation_goal TEXT,
  nav_style TEXT NOT NULL DEFAULT 'sidebar' CHECK (nav_style IN ('sidebar', 'top', 'grouped_sidebar')),
  nav_collapsible BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'launched', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communities_owner ON communities(owner_id);
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);

-- ============================================================================
-- MEMBERSHIP PLANS + MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('one_time', 'monthly', 'yearly', 'free')),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_plans_community ON community_membership_plans(community_id);

CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  plan_id UUID REFERENCES community_membership_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned')),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);

-- ============================================================================
-- RLS HELPER FUNCTIONS (SECURITY DEFINER avoids recursive-policy deadlocks)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_community_member(p_community_id UUID) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community_id AND user_id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_community_admin(p_community_id UUID) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community_id AND user_id = auth.uid()
      AND status = 'active' AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION is_community_public(p_community_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM communities WHERE id = p_community_id AND privacy = 'public');
$$;

CREATE OR REPLACE FUNCTION member_id_for(p_community_id UUID) RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM community_members
  WHERE community_id = p_community_id AND user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

-- ============================================================================
-- MEMBER PROFILE BUILDER
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_profile_field_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text', 'textarea', 'number', 'location', 'website', 'social_links', 'checkbox',
    'select', 'radio', 'date', 'photo', 'gallery', 'skills', 'interests',
    'needs_help_with', 'can_help_with', 'experience_level', 'custom'
  )),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  required BOOLEAN NOT NULL DEFAULT false,
  show_in_directory BOOLEAN NOT NULL DEFAULT false,
  filterable BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, key)
);

CREATE INDEX IF NOT EXISTS idx_profile_field_defs_community ON community_profile_field_defs(community_id);

CREATE TABLE IF NOT EXISTS community_member_profile_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES community_profile_field_defs(id) ON DELETE CASCADE,
  value JSONB NOT NULL DEFAULT 'null'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_values_member ON community_member_profile_values(member_id);
CREATE INDEX IF NOT EXISTS idx_profile_values_field ON community_member_profile_values(field_id);

-- ============================================================================
-- SPACES
-- ============================================================================

CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  icon TEXT NOT NULL DEFAULT 'layout-grid',
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'members' CHECK (visibility IN ('public', 'members', 'private')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  space_type TEXT NOT NULL CHECK (space_type IN (
    'discussion', 'journal', 'timeline', 'gallery', 'events', 'courses', 'directory',
    'marketplace', 'files', 'wiki', 'blog', 'resources', 'chat', 'polls', 'qa',
    'calendar', 'donations', 'livestreams', 'podcasts', 'progress_tracker', 'goals',
    'leaderboard', 'forms', 'database', 'challenges', 'growth_journey', 'custom'
  )),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  group_label TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_spaces_community ON spaces(community_id);
CREATE INDEX IF NOT EXISTS idx_spaces_sort ON spaces(community_id, sort_order);

CREATE TABLE IF NOT EXISTS space_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN (
    'timeline', 'cards', 'comments', 'likes', 'reactions', 'bookmarks', 'tags',
    'calendar', 'checklist', 'progress_bar', 'leaderboard', 'ai_summary',
    'photo_upload', 'video_upload', 'file_upload', 'location', 'map', 'voting',
    'polls', 'ratings', 'pinned_items', 'search', 'filters', 'custom_fields',
    'notifications'
  )),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_components_space ON space_components(space_id);

-- ============================================================================
-- NAVIGATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES navigation_items(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'space' CHECK (item_type IN ('space', 'group', 'link')),
  label TEXT NOT NULL,
  icon TEXT,
  url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_collapsible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_navigation_items_community ON navigation_items(community_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_navigation_items_parent ON navigation_items(parent_id);

-- ============================================================================
-- JOURNAL BUILDER
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_field_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'checkbox', 'photos', 'videos', 'text', 'textarea', 'number', 'date', 'select',
    'location', 'rating', 'mood', 'weather', 'moon_phase', 'tags', 'custom'
  )),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (space_id, key)
);

CREATE INDEX IF NOT EXISTS idx_journal_field_defs_space ON journal_field_defs(space_id);

-- ============================================================================
-- GENERIC SPACE CONTENT (posts, journal entries, milestones, ...)
-- ============================================================================

CREATE TABLE IF NOT EXISTS space_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'post' CHECK (item_type IN (
    'post', 'journal_entry', 'milestone', 'event', 'resource', 'poll', 'listing', 'wiki_page'
  )),
  title TEXT,
  body TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_items_space ON space_items(space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_space_items_member ON space_items(member_id);

CREATE TABLE IF NOT EXISTS space_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES space_items(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_comments_item ON space_comments(item_id, created_at);

CREATE TABLE IF NOT EXISTS space_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES space_items(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, member_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_space_reactions_item ON space_reactions(item_id);

-- ============================================================================
-- CHALLENGES + BADGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badges_community ON badges(community_id);

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 30,
  points INTEGER NOT NULL DEFAULT 0,
  badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
  daily_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  weekly_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  completion_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_community ON challenges(community_id);

CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'completed', 'dropped')),
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  points_earned INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (challenge_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_member ON challenge_participants(member_id);

CREATE TABLE IF NOT EXISTS member_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_member_badges_member ON member_badges(member_id);

-- ============================================================================
-- GROWTH JOURNEY (per-member timeline, fanned out on write for fast reads)
-- ============================================================================

CREATE TABLE IF NOT EXISTS member_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'journal_entry', 'milestone', 'challenge_completed', 'photo', 'achievement',
    'badge', 'ai_summary', 'post'
  )),
  ref_table TEXT,
  ref_id UUID,
  title TEXT NOT NULL,
  summary TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timeline_events_member ON member_timeline_events(member_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_community ON member_timeline_events(community_id, occurred_at DESC);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_communities_updated_at ON communities;
CREATE TRIGGER trg_communities_updated_at BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_spaces_updated_at ON spaces;
CREATE TRIGGER trg_spaces_updated_at BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_space_items_updated_at ON space_items;
CREATE TRIGGER trg_space_items_updated_at BEFORE UPDATE ON space_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_challenges_updated_at ON challenges;
CREATE TRIGGER trg_challenges_updated_at BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_profile_field_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_member_profile_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_field_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_timeline_events ENABLE ROW LEVEL SECURITY;

-- communities: readable if public or member; writable by owner/admin
DROP POLICY IF EXISTS "communities_select" ON communities;
CREATE POLICY "communities_select" ON communities FOR SELECT
  USING (privacy = 'public' OR is_community_member(id) OR owner_id = auth.uid());

DROP POLICY IF EXISTS "communities_insert" ON communities;
CREATE POLICY "communities_insert" ON communities FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "communities_update" ON communities;
CREATE POLICY "communities_update" ON communities FOR UPDATE
  USING (is_community_admin(id) OR owner_id = auth.uid());

DROP POLICY IF EXISTS "communities_delete" ON communities;
CREATE POLICY "communities_delete" ON communities FOR DELETE
  USING (owner_id = auth.uid());

-- membership plans: visible to anyone who can see the community, managed by admins
DROP POLICY IF EXISTS "plans_select" ON community_membership_plans;
CREATE POLICY "plans_select" ON community_membership_plans FOR SELECT
  USING (is_community_public(community_id) OR is_community_member(community_id) OR is_community_admin(community_id));

DROP POLICY IF EXISTS "plans_write" ON community_membership_plans;
CREATE POLICY "plans_write" ON community_membership_plans FOR ALL
  USING (is_community_admin(community_id)) WITH CHECK (is_community_admin(community_id));

-- community_members: members can see other members of their community; anyone can
-- request to join (insert own row); admins manage roles/status
DROP POLICY IF EXISTS "members_select" ON community_members;
CREATE POLICY "members_select" ON community_members FOR SELECT
  USING (is_community_member(community_id) OR is_community_admin(community_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "members_insert" ON community_members;
CREATE POLICY "members_insert" ON community_members FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_community_admin(community_id));

DROP POLICY IF EXISTS "members_update" ON community_members;
CREATE POLICY "members_update" ON community_members FOR UPDATE
  USING (user_id = auth.uid() OR is_community_admin(community_id));

DROP POLICY IF EXISTS "members_delete" ON community_members;
CREATE POLICY "members_delete" ON community_members FOR DELETE
  USING (user_id = auth.uid() OR is_community_admin(community_id));

-- profile field defs: readable by members, writable by admins
DROP POLICY IF EXISTS "profile_fields_select" ON community_profile_field_defs;
CREATE POLICY "profile_fields_select" ON community_profile_field_defs FOR SELECT
  USING (is_community_public(community_id) OR is_community_member(community_id) OR is_community_admin(community_id));

DROP POLICY IF EXISTS "profile_fields_write" ON community_profile_field_defs;
CREATE POLICY "profile_fields_write" ON community_profile_field_defs FOR ALL
  USING (is_community_admin(community_id)) WITH CHECK (is_community_admin(community_id));

-- profile values: member owns their own values; other members can read (directory)
DROP POLICY IF EXISTS "profile_values_select" ON community_member_profile_values;
CREATE POLICY "profile_values_select" ON community_member_profile_values FOR SELECT
  USING (
    member_id IN (
      SELECT cm.id FROM community_members cm
      WHERE is_community_member(cm.community_id) OR is_community_admin(cm.community_id)
    )
  );

DROP POLICY IF EXISTS "profile_values_write" ON community_member_profile_values;
CREATE POLICY "profile_values_write" ON community_member_profile_values FOR ALL
  USING (member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid()))
  WITH CHECK (member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid()));

-- spaces: visible per space.visibility; managed by admins
DROP POLICY IF EXISTS "spaces_select" ON spaces;
CREATE POLICY "spaces_select" ON spaces FOR SELECT
  USING (
    is_community_admin(community_id)
    OR (visibility = 'public' AND (is_community_public(community_id) OR is_community_member(community_id)))
    OR (visibility = 'members' AND is_community_member(community_id))
  );

DROP POLICY IF EXISTS "spaces_write" ON spaces;
CREATE POLICY "spaces_write" ON spaces FOR ALL
  USING (is_community_admin(community_id)) WITH CHECK (is_community_admin(community_id));

-- space components follow their parent space's admin ownership; read follows space visibility
DROP POLICY IF EXISTS "space_components_select" ON space_components;
CREATE POLICY "space_components_select" ON space_components FOR SELECT
  USING (space_id IN (SELECT id FROM spaces));

DROP POLICY IF EXISTS "space_components_write" ON space_components;
CREATE POLICY "space_components_write" ON space_components FOR ALL
  USING (space_id IN (SELECT id FROM spaces WHERE is_community_admin(community_id)))
  WITH CHECK (space_id IN (SELECT id FROM spaces WHERE is_community_admin(community_id)));

-- navigation: readable by anyone who can read the community, writable by admins
DROP POLICY IF EXISTS "navigation_select" ON navigation_items;
CREATE POLICY "navigation_select" ON navigation_items FOR SELECT
  USING (is_community_public(community_id) OR is_community_member(community_id) OR is_community_admin(community_id));

DROP POLICY IF EXISTS "navigation_write" ON navigation_items;
CREATE POLICY "navigation_write" ON navigation_items FOR ALL
  USING (is_community_admin(community_id)) WITH CHECK (is_community_admin(community_id));

-- journal field defs: follow parent space
DROP POLICY IF EXISTS "journal_fields_select" ON journal_field_defs;
CREATE POLICY "journal_fields_select" ON journal_field_defs FOR SELECT
  USING (space_id IN (SELECT id FROM spaces));

DROP POLICY IF EXISTS "journal_fields_write" ON journal_field_defs;
CREATE POLICY "journal_fields_write" ON journal_field_defs FOR ALL
  USING (space_id IN (SELECT id FROM spaces WHERE is_community_admin(community_id)))
  WITH CHECK (space_id IN (SELECT id FROM spaces WHERE is_community_admin(community_id)));

-- space_items: readable by members of the parent community; writable by the author or admins
DROP POLICY IF EXISTS "space_items_select" ON space_items;
CREATE POLICY "space_items_select" ON space_items FOR SELECT
  USING (space_id IN (SELECT id FROM spaces));

DROP POLICY IF EXISTS "space_items_insert" ON space_items;
CREATE POLICY "space_items_insert" ON space_items FOR INSERT
  WITH CHECK (member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "space_items_update" ON space_items;
CREATE POLICY "space_items_update" ON space_items FOR UPDATE
  USING (
    member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR space_id IN (SELECT id FROM spaces WHERE is_community_admin(community_id))
  );

DROP POLICY IF EXISTS "space_items_delete" ON space_items;
CREATE POLICY "space_items_delete" ON space_items FOR DELETE
  USING (
    member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR space_id IN (SELECT id FROM spaces WHERE is_community_admin(community_id))
  );

-- comments + reactions: any active member of the community can read/write their own
DROP POLICY IF EXISTS "space_comments_select" ON space_comments;
CREATE POLICY "space_comments_select" ON space_comments FOR SELECT
  USING (item_id IN (SELECT id FROM space_items));

DROP POLICY IF EXISTS "space_comments_insert" ON space_comments;
CREATE POLICY "space_comments_insert" ON space_comments FOR INSERT
  WITH CHECK (member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "space_comments_delete" ON space_comments;
CREATE POLICY "space_comments_delete" ON space_comments FOR DELETE
  USING (
    member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR item_id IN (SELECT id FROM space_items WHERE space_id IN (SELECT id FROM spaces WHERE is_community_admin(community_id)))
  );

DROP POLICY IF EXISTS "space_reactions_select" ON space_reactions;
CREATE POLICY "space_reactions_select" ON space_reactions FOR SELECT
  USING (item_id IN (SELECT id FROM space_items));

DROP POLICY IF EXISTS "space_reactions_write" ON space_reactions;
CREATE POLICY "space_reactions_write" ON space_reactions FOR ALL
  USING (member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid()))
  WITH CHECK (member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid()));

-- badges + challenges: readable by members, writable by admins
DROP POLICY IF EXISTS "badges_select" ON badges;
CREATE POLICY "badges_select" ON badges FOR SELECT
  USING (is_community_public(community_id) OR is_community_member(community_id) OR is_community_admin(community_id));

DROP POLICY IF EXISTS "badges_write" ON badges;
CREATE POLICY "badges_write" ON badges FOR ALL
  USING (is_community_admin(community_id)) WITH CHECK (is_community_admin(community_id));

DROP POLICY IF EXISTS "challenges_select" ON challenges;
CREATE POLICY "challenges_select" ON challenges FOR SELECT
  USING (is_community_public(community_id) OR is_community_member(community_id) OR is_community_admin(community_id));

DROP POLICY IF EXISTS "challenges_write" ON challenges;
CREATE POLICY "challenges_write" ON challenges FOR ALL
  USING (is_community_admin(community_id)) WITH CHECK (is_community_admin(community_id));

DROP POLICY IF EXISTS "challenge_participants_select" ON challenge_participants;
CREATE POLICY "challenge_participants_select" ON challenge_participants FOR SELECT
  USING (challenge_id IN (SELECT id FROM challenges));

DROP POLICY IF EXISTS "challenge_participants_write" ON challenge_participants;
CREATE POLICY "challenge_participants_write" ON challenge_participants FOR ALL
  USING (
    member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR challenge_id IN (SELECT id FROM challenges WHERE is_community_admin(community_id))
  )
  WITH CHECK (
    member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR challenge_id IN (SELECT id FROM challenges WHERE is_community_admin(community_id))
  );

DROP POLICY IF EXISTS "member_badges_select" ON member_badges;
CREATE POLICY "member_badges_select" ON member_badges FOR SELECT
  USING (member_id IN (SELECT id FROM community_members));

DROP POLICY IF EXISTS "member_badges_write" ON member_badges;
CREATE POLICY "member_badges_write" ON member_badges FOR ALL
  USING (member_id IN (SELECT id FROM community_members WHERE is_community_admin(community_id)))
  WITH CHECK (member_id IN (SELECT id FROM community_members WHERE is_community_admin(community_id)));

-- timeline: a member's own events are always visible to them; other members can see
-- the community feed; writes happen via the fan-out helper below (SECURITY DEFINER)
-- and via admins directly
DROP POLICY IF EXISTS "timeline_select" ON member_timeline_events;
CREATE POLICY "timeline_select" ON member_timeline_events FOR SELECT
  USING (is_community_member(community_id) OR is_community_admin(community_id));

DROP POLICY IF EXISTS "timeline_write" ON member_timeline_events;
CREATE POLICY "timeline_write" ON member_timeline_events FOR INSERT
  WITH CHECK (
    member_id IN (SELECT id FROM community_members WHERE user_id = auth.uid())
    OR is_community_admin(community_id)
  );

-- ============================================================================
-- Fan-out helper: record a Growth Journey timeline event alongside its source
-- row. Called from the app layer (not a trigger) so any future event source
-- can opt in without new hard-coded logic per space type.
-- ============================================================================

CREATE OR REPLACE FUNCTION record_timeline_event(
  p_community_id UUID,
  p_member_id UUID,
  p_space_id UUID,
  p_event_type TEXT,
  p_ref_table TEXT,
  p_ref_id UUID,
  p_title TEXT,
  p_summary TEXT,
  p_data JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO member_timeline_events (
    community_id, member_id, space_id, event_type, ref_table, ref_id, title, summary, data
  ) VALUES (
    p_community_id, p_member_id, p_space_id, p_event_type, p_ref_table, p_ref_id, p_title, p_summary,
    COALESCE(p_data, '{}'::jsonb)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
