-- Migration to enforce unique display_name on creator_profiles
ALTER TABLE "public"."creator_profiles" 
ADD CONSTRAINT "creator_profiles_display_name_key" UNIQUE ("display_name");
