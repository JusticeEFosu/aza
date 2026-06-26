-- Migration: 009_add_suspended_status.sql
-- Description: Adds is_suspended column to profiles to allow admins to suspend bad actors.

ALTER TABLE "public"."profiles" ADD COLUMN "is_suspended" BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure Admins can update this column
CREATE POLICY "Admins can update suspension status"
  ON profiles FOR UPDATE
  USING (public.is_admin());
