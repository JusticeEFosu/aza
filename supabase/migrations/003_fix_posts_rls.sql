-- Allow any authenticated user to SELECT all posts (public and gated).
-- Content scrubbing (blurring, locking) is handled in the application layer.
-- This policy works alongside the existing "Public posts are viewable by everyone" policy.

CREATE POLICY "Authenticated users can view all posts"
  ON posts FOR SELECT
  TO authenticated
  USING (true);
