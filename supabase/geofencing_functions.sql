-- Function: Update office location for a company
-- This function safely updates the office location and radius

-- Drop the existing function first to allow return type change
DROP FUNCTION IF EXISTS update_office_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE OR REPLACE FUNCTION update_office_location(
    p_company_id UUID,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_radius INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows_affected INT;
BEGIN
    UPDATE companies
    SET 
        office_location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        office_radius_meters = p_radius
    WHERE id = p_company_id;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    IF v_rows_affected = 0 THEN
        RAISE EXCEPTION 'Company not found or no changes made';
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Office location updated successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$;

-- Function: Calculate distance from employee location to office
CREATE OR REPLACE FUNCTION calculate_distance_to_office(
    p_company_id UUID,
    p_employee_lat DOUBLE PRECISION,
    p_employee_lon DOUBLE PRECISION
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_distance NUMERIC;
BEGIN
    SELECT ST_Distance(
        office_location,
        ST_SetSRID(ST_MakePoint(p_employee_lon, p_employee_lat), 4326)::geography
    )
    INTO v_distance
    FROM companies
    WHERE id = p_company_id;
    
    RETURN v_distance;
END;
$$;

-- Function: Check if employee is within office radius
CREATE OR REPLACE FUNCTION is_within_office_radius(
    p_company_id UUID,
    p_employee_lat DOUBLE PRECISION,
    p_employee_lon DOUBLE PRECISION
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_distance NUMERIC;
    v_radius INTEGER;
BEGIN
    SELECT 
        ST_Distance(
            office_location,
            ST_SetSRID(ST_MakePoint(p_employee_lon, p_employee_lat), 4326)::geography
        ),
        office_radius_meters
    INTO v_distance, v_radius
    FROM companies
    WHERE id = p_company_id;
    
    -- If no office location set, allow check-in (backward compatibility)
    IF v_distance IS NULL THEN
        RETURN TRUE;
    END IF;
    
    RETURN v_distance <= v_radius;
END;
$$;

COMMENT ON FUNCTION update_office_location IS 'Updates company office location and radius for geo-fencing';
COMMENT ON FUNCTION calculate_distance_to_office IS 'Calculates distance in meters from employee location to office';
COMMENT ON FUNCTION is_within_office_radius IS 'Checks if employee is within allowed check-in radius';
