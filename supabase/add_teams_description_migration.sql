-- Add description column to teams
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.teams.description IS 'Department description';
