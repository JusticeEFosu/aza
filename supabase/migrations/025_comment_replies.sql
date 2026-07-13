ALTER TABLE post_comments
ADD COLUMN parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE;
