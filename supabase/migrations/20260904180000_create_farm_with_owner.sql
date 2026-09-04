-- Create a farm and its first owner membership in one transaction.
-- This avoids the RLS bootstrap problem where a user cannot become a farm
-- member until the farm exists, but cannot insert the farm without membership.

CREATE OR REPLACE FUNCTION public.create_farm_with_owner(
  p_name text,
  p_slug text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text := btrim(p_name);
  v_base_slug text := btrim(p_slug);
  v_slug text;
  v_farm_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to create a farm'
      USING ERRCODE = '42501';
  END IF;

  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'Farm name is required'
      USING ERRCODE = '22023';
  END IF;

  IF v_base_slug IS NULL OR v_base_slug = '' THEN
    v_base_slug := 'farm';
  END IF;

  v_base_slug := left(v_base_slug, 54);
  v_slug := v_base_slug;

  -- Farm names may repeat, while public slugs must remain unique.
  WHILE EXISTS (SELECT 1 FROM public.farms WHERE slug = v_slug) LOOP
    v_slug := v_base_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  END LOOP;

  INSERT INTO public.farms (name, slug, is_active, created_by)
  VALUES (v_name, v_slug, true, v_user_id)
  RETURNING id INTO v_farm_id;

  INSERT INTO public.farm_members (
    farm_id,
    profile_id,
    user_email,
    role_on_farm
  )
  VALUES (
    v_farm_id,
    v_user_id,
    auth.jwt() ->> 'email',
    'owner'
  );

  RETURN v_farm_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_farm_with_owner(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_farm_with_owner(text, text) TO authenticated;
