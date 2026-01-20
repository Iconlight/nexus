-- Migration: Update Sick Leave Logic
-- Description: Modifies handle_leave_approval to prevent deduction of leave days for 'sick' leave type.

CREATE OR REPLACE FUNCTION public.handle_leave_approval()
RETURNS TRIGGER AS $$
DECLARE
    days_count INTEGER;
BEGIN
    -- Only proceed if status changed to 'approved'
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
        
        -- ONLY deduct if type is NOT sick
        IF NEW.leave_type != 'sick' THEN
            -- Calculate days
            days_count := public.calculate_leave_days(NEW.start_date, NEW.end_date);
            
            -- Update Profile
            UPDATE public.profiles
            SET allowed_leave_days = allowed_leave_days - days_count
            WHERE id = NEW.employee_id;
        END IF;
        
        -- Set approved_at if not set (though app should set it, safe fallback)
        IF NEW.approved_at IS NULL THEN
            NEW.approved_at := NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
