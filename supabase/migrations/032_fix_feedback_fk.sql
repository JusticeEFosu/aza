ALTER TABLE platform_feedback DROP CONSTRAINT IF EXISTS platform_feedback_user_id_fkey;
ALTER TABLE platform_feedback ADD CONSTRAINT platform_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
