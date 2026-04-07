-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'farm_map_layouts'
) as table_exists;

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'farm_map_layouts'
ORDER BY ordinal_position;

-- Check RLS status
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'farm_map_layouts';

-- Check existing policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'farm_map_layouts';

-- Check if any data exists
SELECT COUNT(*) as record_count FROM farm_map_layouts;

-- Check farms table (to make sure foreign key target exists)
SELECT COUNT(*) as farms_count FROM farms;