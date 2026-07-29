-- =====================================================
-- SYNC EXISTING CREATOR DISPLAY NAMES
-- This migration retroactively updates the global profiles table
-- so that any creator who updated their name in the past will 
-- have it correctly reflected across the entire platform.
-- =====================================================

UPDATE public.profiles p
SET display_name = cp.display_name
FROM public.creator_profiles cp
WHERE p.id = cp.id
AND cp.display_name IS NOT NULL
AND p.display_name IS DISTINCT FROM cp.display_name;
