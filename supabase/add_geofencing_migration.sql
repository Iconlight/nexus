-- Migration: Add geo-fencing support to companies table
-- Date: 2025-12-25
-- Description: Adds office location and radius for check-in validation

-- Add geo-fencing columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS office_location GEOGRAPHY(POINT, 4326),
ADD COLUMN IF NOT EXISTS office_radius_meters INTEGER DEFAULT 100;

-- Add comments for documentation
COMMENT ON COLUMN public.companies.office_location IS 'Office GPS coordinates (latitude, longitude) for geo-fencing employee check-ins';
COMMENT ON COLUMN public.companies.office_radius_meters IS 'Allowed check-in radius in meters from office location (default: 100m)';

-- Example: Set office location for a company
-- UPDATE companies 
-- SET office_location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
--     office_radius_meters = 200
-- WHERE id = 'company-uuid-here';
