-- Migration: 013_fix_signup_trigger.sql
-- Description: Updates handle_new_user to use a guaranteed unique placeholder for creator display_name to prevent UNIQUE constraint violations on signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  unique_suffix TEXT;
BEGIN
  unique_suffix := LEFT(NEW.id::TEXT, 8);

  -- 1. Insert into standard profiles
  INSERT INTO public.profiles (id, email, full_name, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    -- For regular profiles, display_name can fall back to full_name (no strict UNIQUE constraint here)
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'fan'::public.user_role)
  );

  -- 2. If signing up as a creator, create their specialized profile too
  IF NEW.raw_user_meta_data->>'role' = 'creator' THEN
    
    -- Generate base slug from display name or full name
    base_slug := LOWER(REGEXP_REPLACE(
      COALESCE(
        NEW.raw_user_meta_data->>'display_name', 
        NEW.raw_user_meta_data->>'full_name', 
        'creator'
      ),
      '[^a-zA-Z0-9]', '-', 'g'
    ));

    -- Append a short ID to guarantee uniqueness for slug
    final_slug := base_slug || '-' || unique_suffix;

    INSERT INTO public.creator_profiles (id, slug, display_name)
    VALUES (
      NEW.id,
      final_slug,
      -- Use a guaranteed unique placeholder for display_name
      'Creator ' || unique_suffix
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
