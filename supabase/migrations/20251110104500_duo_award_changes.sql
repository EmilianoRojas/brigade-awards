-- 1. Add is_duo column to awards table
ALTER TABLE public.awards
ADD COLUMN is_duo BOOLEAN NOT NULL DEFAULT false;

-- Optional: Migrate existing data from jsonb to the new column
-- UPDATE public.awards
-- SET is_duo = TRUE
-- WHERE nomination_criteria->>'isDuo' = 'true';

-- 2. Modify final_votes table
-- Add nomination_group_id column
ALTER TABLE public.final_votes
ADD COLUMN nomination_group_id UUID;

-- Make nominee_user_id nullable
ALTER TABLE public.final_votes
ALTER COLUMN nominee_user_id DROP NOT NULL;

-- Add check constraint to ensure either nominee_user_id or nomination_group_id is provided
ALTER TABLE public.final_votes
ADD CONSTRAINT check_one_nominee
CHECK (
  (nominee_user_id IS NOT NULL AND nomination_group_id IS NULL) OR
  (nominee_user_id IS NULL AND nomination_group_id IS NOT NULL)
);