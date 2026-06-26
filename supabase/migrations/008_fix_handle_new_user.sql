-- Migration: 008_fix_handle_new_user.sql
-- Description: Restores public.user_role schema prefix, restores display_name insertion, and guarantees unique slugs.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
BEGIN
  -- 1. Insert into standard profiles (restoring display_name and public.user_role)
  INSERT INTO public.profiles (id, email, full_name, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
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

    -- Append a short ID to guarantee uniqueness and prevent constraint errors
    final_slug := base_slug || '-' || LEFT(NEW.id::TEXT, 8);

    INSERT INTO public.creator_profiles (id, slug, display_name)
    VALUES (
      NEW.id,
      final_slug,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'Creator')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
