-- Migration to add embed_url to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS embed_url TEXT;
