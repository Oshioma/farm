-- Lunar Farming Planner — automatic moon phases + task reminders
--
-- Upgrades the lunar_days / lunar_tasks schema created by
-- create_lunar_planner_tables.sql:
--   * lunar_days gains calculated_moon_phase, manual_moon_phase and
--     moon_phase_override (replacing the old single moon_phase column).
--   * lunar_tasks gains reminder_date, reminder_note and reminder_status.
--
-- Safe to run on a fresh database (the CREATEs use IF NOT EXISTS) or on top of
-- the original migration (the ALTERs use IF NOT EXISTS / IF EXISTS).

-- ---------------------------------------------------------------------------
-- Base tables (no-op if they already exist)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lunar_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calculated_moon_phase TEXT,
  manual_moon_phase TEXT,
  moon_phase_override BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT lunar_days_user_date_unique UNIQUE (user_id, date)
);

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
  reminder_date DATE,
  reminder_note TEXT,
  reminder_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- lunar_days: add new moon-phase columns
-- ---------------------------------------------------------------------------
ALTER TABLE lunar_days ADD COLUMN IF NOT EXISTS calculated_moon_phase TEXT;
ALTER TABLE lunar_days ADD COLUMN IF NOT EXISTS manual_moon_phase TEXT;
ALTER TABLE lunar_days ADD COLUMN IF NOT EXISTS moon_phase_override BOOLEAN DEFAULT FALSE;

-- Migrate any pre-existing manually entered phase into the override columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lunar_days' AND column_name = 'moon_phase'
  ) THEN
    UPDATE lunar_days
       SET manual_moon_phase = moon_phase,
           moon_phase_override = TRUE
     WHERE moon_phase IS NOT NULL
       AND manual_moon_phase IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- lunar_tasks: add reminder columns
-- ---------------------------------------------------------------------------
ALTER TABLE lunar_tasks ADD COLUMN IF NOT EXISTS reminder_date DATE;
ALTER TABLE lunar_tasks ADD COLUMN IF NOT EXISTS reminder_note TEXT;
ALTER TABLE lunar_tasks ADD COLUMN IF NOT EXISTS reminder_status TEXT DEFAULT 'pending';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lunar_days_user_id ON lunar_days(user_id);
CREATE INDEX IF NOT EXISTS idx_lunar_days_user_date ON lunar_days(user_id, date);
CREATE INDEX IF NOT EXISTS idx_lunar_tasks_user_id ON lunar_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_lunar_tasks_user_date ON lunar_tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_lunar_tasks_day_id ON lunar_tasks(lunar_day_id);
-- Speeds up the "reminders due today" lookup.
CREATE INDEX IF NOT EXISTS idx_lunar_tasks_reminder
  ON lunar_tasks(user_id, reminder_status, reminder_date);

-- ---------------------------------------------------------------------------
-- Row Level Security — users only ever touch their own rows
-- ---------------------------------------------------------------------------
ALTER TABLE lunar_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunar_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own lunar days" ON lunar_days;
DROP POLICY IF EXISTS "Users can insert their own lunar days" ON lunar_days;
DROP POLICY IF EXISTS "Users can update their own lunar days" ON lunar_days;
DROP POLICY IF EXISTS "Users can delete their own lunar days" ON lunar_days;

CREATE POLICY "Users can view their own lunar days"
  ON lunar_days FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own lunar days"
  ON lunar_days FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own lunar days"
  ON lunar_days FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their own lunar days"
  ON lunar_days FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can insert their own lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can update their own lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can delete their own lunar tasks" ON lunar_tasks;

CREATE POLICY "Users can view their own lunar tasks"
  ON lunar_tasks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own lunar tasks"
  ON lunar_tasks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own lunar tasks"
  ON lunar_tasks FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their own lunar tasks"
  ON lunar_tasks FOR DELETE USING (user_id = auth.uid());

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
