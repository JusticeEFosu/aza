-- Add is_admin column to profiles
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT is_admin FROM public.profiles WHERE id = auth.uid();
$$;

-- Grant admin access to profiles
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete any profile"
  ON profiles FOR DELETE
  USING (public.is_admin());

-- Grant admin access to creator_profiles
CREATE POLICY "Admins can update any creator profile"
  ON creator_profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete any creator profile"
  ON creator_profiles FOR DELETE
  USING (public.is_admin());

-- Grant admin access to posts
CREATE POLICY "Admins can update any post"
  ON posts FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete any post"
  ON posts FOR DELETE
  USING (public.is_admin());

-- Grant admin access to tiers
CREATE POLICY "Admins can update any tier"
  ON tiers FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete any tier"
  ON tiers FOR DELETE
  USING (public.is_admin());
