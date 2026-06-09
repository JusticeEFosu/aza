-- Migration to add display_name to creator_profiles
ALTER TABLE "public"."creator_profiles" ADD COLUMN "display_name" text;
