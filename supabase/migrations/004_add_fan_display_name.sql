-- Migration: Add display_name to profiles table
-- Use this to allow fans (and creators) to have a public handle different from their legal/full name.

-- 1. Add the column
ALTER TABLE "public"."profiles" ADD COLUMN "display_name" text;

-- 2. Initialize display_name with full_name for all existing users
UPDATE "public"."profiles" SET "display_name" = "full_name" WHERE "display_name" IS NULL;

-- 3. Update the handle_new_user function to include display_name on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'fan')
  );

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
