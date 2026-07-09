-- Create ENUM type for admin roles
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'finance_manager', 'moderator', 'support_agent');

-- Add admin_role column
ALTER TABLE public.profiles ADD COLUMN admin_role public.admin_role;

-- Migrate existing admins to super_admin
UPDATE public.profiles SET admin_role = 'super_admin' WHERE is_admin = true;

-- Drop is_admin column
ALTER TABLE public.profiles DROP COLUMN is_admin;

-- Create function to check roles
CREATE OR REPLACE FUNCTION public.has_role(VARIADIC roles public.admin_role[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND admin_role = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redefine is_admin() to check for super_admin as fallback for any missed policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND admin_role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now we drop and recreate the specific RLS policies with RBAC logic

-- 1. Profiles & Creator Profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Staff can view all profiles"
  ON profiles FOR SELECT
  USING (public.has_role('super_admin', 'moderator', 'support_agent', 'finance_manager'));

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Staff can update profiles"
  ON profiles FOR UPDATE
  USING (public.has_role('super_admin', 'moderator'));

DROP POLICY IF EXISTS "Admins can view all creator profiles" ON creator_profiles;
CREATE POLICY "Staff can view all creator profiles"
  ON creator_profiles FOR SELECT
  USING (public.has_role('super_admin', 'moderator', 'support_agent', 'finance_manager'));

DROP POLICY IF EXISTS "Admins can update all creator profiles" ON creator_profiles;
CREATE POLICY "Staff can update creator profiles"
  ON creator_profiles FOR UPDATE
  USING (public.has_role('super_admin', 'moderator'));

-- 2. Posts
DROP POLICY IF EXISTS "Admins can view all posts" ON posts;
CREATE POLICY "Staff can view all posts"
  ON posts FOR SELECT
  USING (public.has_role('super_admin', 'moderator', 'support_agent'));

DROP POLICY IF EXISTS "Admins can update all posts" ON posts;
CREATE POLICY "Moderators can update posts"
  ON posts FOR UPDATE
  USING (public.has_role('super_admin', 'moderator'));

-- 3. Financials (Transactions & Payouts)
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
CREATE POLICY "Finance can view transactions"
  ON transactions FOR SELECT
  USING (public.has_role('super_admin', 'finance_manager'));

DROP POLICY IF EXISTS "Admins can update all transactions" ON transactions;
CREATE POLICY "Finance can update transactions"
  ON transactions FOR UPDATE
  USING (public.has_role('super_admin', 'finance_manager'));

DROP POLICY IF EXISTS "Admins can view all payouts" ON payouts;
CREATE POLICY "Finance can view payouts"
  ON payouts FOR SELECT
  USING (public.has_role('super_admin', 'finance_manager'));

DROP POLICY IF EXISTS "Admins can update all payouts" ON payouts;
CREATE POLICY "Finance can update payouts"
  ON payouts FOR UPDATE
  USING (public.has_role('super_admin', 'finance_manager'));

DROP POLICY IF EXISTS "Admins can insert payouts" ON payouts;
CREATE POLICY "Finance can insert payouts"
  ON payouts FOR INSERT
  WITH CHECK (public.has_role('super_admin', 'finance_manager'));

-- 4. Platform Pages
DROP POLICY IF EXISTS "Admins can update platform pages" ON platform_pages;
CREATE POLICY "Super Admins can update platform pages"
  ON platform_pages FOR UPDATE
  USING (public.has_role('super_admin'));

DROP POLICY IF EXISTS "Admins can insert platform pages" ON platform_pages;
CREATE POLICY "Super Admins can insert platform pages"
  ON platform_pages FOR INSERT
  WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "Admins can delete platform pages" ON platform_pages;
CREATE POLICY "Super Admins can delete platform pages"
  ON platform_pages FOR DELETE
  USING (public.has_role('super_admin'));

-- 5. Announcements
DROP POLICY IF EXISTS "Admins can update announcements" ON platform_announcements;
CREATE POLICY "Super Admins can update announcements"
  ON platform_announcements FOR UPDATE
  USING (public.has_role('super_admin', 'moderator'));

DROP POLICY IF EXISTS "Admins can insert announcements" ON platform_announcements;
CREATE POLICY "Super Admins can insert announcements"
  ON platform_announcements FOR INSERT
  WITH CHECK (public.has_role('super_admin', 'moderator'));

DROP POLICY IF EXISTS "Admins can delete announcements" ON platform_announcements;
CREATE POLICY "Super Admins can delete announcements"
  ON platform_announcements FOR DELETE
  USING (public.has_role('super_admin', 'moderator'));

-- 6. Moderation (Reports)
DROP POLICY IF EXISTS "Admins can view all reports" ON content_reports;
CREATE POLICY "Moderators can view reports"
  ON content_reports FOR SELECT
  USING (public.has_role('super_admin', 'moderator'));

DROP POLICY IF EXISTS "Admins can update reports" ON content_reports;
CREATE POLICY "Moderators can update reports"
  ON content_reports FOR UPDATE
  USING (public.has_role('super_admin', 'moderator'));
