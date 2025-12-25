-- Migration: Add employee job details fields to profiles table
-- Date: 2025-12-25
-- Description: Adds job title, working hours, and leave allowance fields

-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS working_days_per_week INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS working_hours_per_day NUMERIC DEFAULT 8,
ADD COLUMN IF NOT EXISTS allowed_leave_days INTEGER DEFAULT 21;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.job_title IS 'Employee job title/position';
COMMENT ON COLUMN public.profiles.working_days_per_week IS 'Number of working days per week (default: 5)';
COMMENT ON COLUMN public.profiles.working_hours_per_day IS 'Working hours per day (default: 8)';
COMMENT ON COLUMN public.profiles.allowed_leave_days IS 'Annual leave allowance in days (default: 21)';

-- Update existing employees with default values (if needed)
UPDATE public.profiles 
SET 
    working_days_per_week = COALESCE(working_days_per_week, 5),
    working_hours_per_day = COALESCE(working_hours_per_day, 8),
    allowed_leave_days = COALESCE(allowed_leave_days, 21)
WHERE working_days_per_week IS NULL 
   OR working_hours_per_day IS NULL 
   OR allowed_leave_days IS NULL;
