-- Content Reports Table (Trust & Safety)
CREATE TABLE content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fans can insert reports"
  ON content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON content_reports FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update reports"
  ON content_reports FOR UPDATE
  USING (public.is_admin());

-- Impersonation Tokens Table (God Mode)
CREATE TABLE admin_impersonation_tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  return_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 hour',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- We don't need RLS for admin_impersonation_tokens because it is ONLY accessed via secure server-side API routes bypassing RLS using service_role key.
-- But for safety, we'll enable it and block all public access.
ALTER TABLE admin_impersonation_tokens ENABLE ROW LEVEL SECURITY;
