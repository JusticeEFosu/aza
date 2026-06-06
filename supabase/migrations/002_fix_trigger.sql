-- =========================================================================
-- FIX TRIGGER: Run this in Supabase SQL Editor to resolve the signup error
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    CAST(COALESCE(NEW.raw_user_meta_data->>'role', 'fan') AS public.user_role)
  );

  -- Insert into creator_profiles if they signed up as a creator
  IF NEW.raw_user_meta_data->>'role' = 'creator' THEN
    
    -- Strip special characters from name, or default to 'creator'
    base_slug := LOWER(REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'creator'),
      '[^a-zA-Z0-9]+', '-', 'g'
    ));

    -- Append a piece of their UUID to guarantee uniqueness
    final_slug := base_slug || '-' || LEFT(NEW.id::TEXT, 6);

    INSERT INTO public.creator_profiles (id, slug)
    VALUES (
      NEW.id,
      final_slug
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
