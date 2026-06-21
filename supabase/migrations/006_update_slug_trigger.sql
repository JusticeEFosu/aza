-- =====================================================
-- Update Slug Generation Trigger (Phase 19)
-- =====================================================

-- This migration updates the handle_new_user function to prioritize
-- display_name over full_name when generating the initial profile slug.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles first
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'fan')
  );

  -- If role is creator, generate slug from display_name (falling back to full_name)
  IF NEW.raw_user_meta_data->>'role' = 'creator' THEN
    INSERT INTO public.creator_profiles (id, slug)
    VALUES (
      NEW.id,
      LOWER(REGEXP_REPLACE(
        COALESCE(
          NEW.raw_user_meta_data->>'display_name', 
          NEW.raw_user_meta_data->>'full_name', 
          'creator-' || LEFT(NEW.id::TEXT, 8)
        ),
        '[^a-zA-Z0-9]', '-', 'g'
      ))
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
