-- Lunar Farming Planner
-- Creates the lunar_days and lunar_tasks tables used by the /lunar-planner page.
-- Both tables are scoped to the authenticated user (auth.users) so each farmer
-- keeps their own private lunar planning calendar.

-- ---------------------------------------------------------------------------
-- lunar_days: one row per (user, date). Stores the manually chosen moon phase
-- and a free-text notes area for that day.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lunar_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  moon_phase TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- A user only ever has a single planning record per calendar day.
  CONSTRAINT lunar_days_user_date_unique UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_lunar_days_user_id ON lunar_days(user_id);
CREATE INDEX IF NOT EXISTS idx_lunar_days_user_date ON lunar_days(user_id, date);

-- ---------------------------------------------------------------------------
-- lunar_tasks: tasks attached to a given day. lunar_day_id links to the parent
-- day; date is duplicated for simple range queries and so tasks survive even if
-- queried directly.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lunar_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lunar_day_id UUID REFERENCES lunar_days(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  crop_or_activity TEXT,
  notes TEXT,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lunar_tasks_user_id ON lunar_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_lunar_tasks_user_date ON lunar_tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_lunar_tasks_day_id ON lunar_tasks(lunar_day_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: users can only see and modify their own rows.
-- ---------------------------------------------------------------------------
ALTER TABLE lunar_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunar_tasks ENABLE ROW LEVEL SECURITY;

-- lunar_days policies
DROP POLICY IF EXISTS "Users can view their own lunar days" ON lunar_days;
DROP POLICY IF EXISTS "Users can insert their own lunar days" ON lunar_days;
DROP POLICY IF EXISTS "Users can update their own lunar days" ON lunar_days;
DROP POLICY IF EXISTS "Users can delete their own lunar days" ON lunar_days;

CREATE POLICY "Users can view their own lunar days"
  ON lunar_days
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own lunar days"
  ON lunar_days
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own lunar days"
  ON lunar_days
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own lunar days"
  ON lunar_days
  FOR DELETE
  USING (user_id = auth.uid());

-- lunar_tasks policies
DROP POLICY IF EXISTS "Users can view their own lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can insert their own lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can update their own lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can delete their own lunar tasks" ON lunar_tasks;

CREATE POLICY "Users can view their own lunar tasks"
  ON lunar_tasks
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own lunar tasks"
  ON lunar_tasks
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own lunar tasks"
  ON lunar_tasks
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own lunar tasks"
  ON lunar_tasks
  FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- keep updated_at fresh on update
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_lunar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lunar_days_updated_at ON lunar_days;
CREATE TRIGGER trg_lunar_days_updated_at
  BEFORE UPDATE ON lunar_days
  FOR EACH ROW EXECUTE FUNCTION set_lunar_updated_at();

DROP TRIGGER IF EXISTS trg_lunar_tasks_updated_at ON lunar_tasks;
CREATE TRIGGER trg_lunar_tasks_updated_at
  BEFORE UPDATE ON lunar_tasks
  FOR EACH ROW EXECUTE FUNCTION set_lunar_updated_at();
