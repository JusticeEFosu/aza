CREATE TABLE platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can read active announcements
CREATE POLICY "Public can view active announcements"
  ON platform_announcements FOR SELECT
  USING (is_active = true);

-- Admins can view all announcements
CREATE POLICY "Admins can view all announcements"
  ON platform_announcements FOR SELECT
  USING (public.is_admin());

-- Admins can insert announcements
CREATE POLICY "Admins can insert announcements"
  ON platform_announcements FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update announcements
CREATE POLICY "Admins can update announcements"
  ON platform_announcements FOR UPDATE
  USING (public.is_admin());

-- Admins can delete announcements
CREATE POLICY "Admins can delete announcements"
  ON platform_announcements FOR DELETE
  USING (public.is_admin());

-- Insert a default inactive announcement to modify
INSERT INTO platform_announcements (message, is_active) VALUES ('Welcome to MyAzaa!', false);
