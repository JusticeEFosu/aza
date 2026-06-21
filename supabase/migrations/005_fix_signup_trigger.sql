-- Migration: 005_fix_signup_trigger.sql
-- Description: Adds missing display_name to creator_profiles and fixes the signup trigger

-- 1. Add the missing display_name column to creator_profiles
ALTER TABLE "public"."creator_profiles" ADD COLUMN IF NOT EXISTS "display_name" text;

-- 2. Initialize it for existing creators
UPDATE "public"."creator_profiles" 
SET "display_name" = p.full_name 
FROM public.profiles p 
WHERE public.creator_profiles.id = p.id AND public.creator_profiles.display_name IS NULL;

-- 3. Update the signup trigger to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into standard profiles
  INSERT INTO public.profiles (id, email, full_name, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'fan'::public.user_role)
  );

  -- If signing up as a creator, create their specialized profile too
  IF NEW.raw_user_meta_data->>'role' = 'creator' THEN
    INSERT INTO public.creator_profiles (id, slug, display_name)
    VALUES (
      NEW.id,
      LOWER(REGEXP_REPLACE(
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'creator-' || LEFT(NEW.id::TEXT, 8)),
        '[^a-zA-Z0-9]', '-', 'g'
      )),
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'Creator')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
