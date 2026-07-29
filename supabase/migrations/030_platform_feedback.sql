-- =====================================================
-- PLATFORM FEEDBACK TABLE
-- Allows any visitor (logged-in or anonymous) to submit feedback.
-- =====================================================

CREATE TABLE platform_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('bug', 'feature', 'general')),
  message TEXT NOT NULL CHECK (char_length(message) <= 2000),
  page_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platform_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous/unauthenticated) can insert feedback
CREATE POLICY "Anyone can submit feedback"
  ON platform_feedback FOR INSERT
  WITH CHECK (true);

-- Only admins read/update feedback via createAdminClient() which bypasses RLS.
-- No SELECT/UPDATE policies for regular users.

-- Index for admin filtering by status
CREATE INDEX idx_platform_feedback_status ON platform_feedback(status);
CREATE INDEX idx_platform_feedback_created_at ON platform_feedback(created_at DESC);
