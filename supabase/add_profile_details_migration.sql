-- Add gender and base_salary columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
ADD COLUMN IF NOT EXISTS base_salary NUMERIC;

COMMENT ON COLUMN public.profiles.gender IS 'Employee gender identity';
COMMENT ON COLUMN public.profiles.base_salary IS 'Base monthly salary';
