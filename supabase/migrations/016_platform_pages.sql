CREATE TABLE platform_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE platform_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can read published pages
CREATE POLICY "Public can view published pages"
  ON platform_pages FOR SELECT
  USING (is_published = true);

-- Admins can view all pages (including drafts)
CREATE POLICY "Admins can view all pages"
  ON platform_pages FOR SELECT
  USING (public.is_admin());

-- Admins can insert pages
CREATE POLICY "Admins can insert pages"
  ON platform_pages FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update pages
CREATE POLICY "Admins can update pages"
  ON platform_pages FOR UPDATE
  USING (public.is_admin());

-- Admins can delete pages
CREATE POLICY "Admins can delete pages"
  ON platform_pages FOR DELETE
  USING (public.is_admin());
