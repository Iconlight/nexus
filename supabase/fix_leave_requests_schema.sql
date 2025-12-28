-- Fix Leave Requests Schema

-- 1. Add missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'approved_at') THEN
        ALTER TABLE public.leave_requests ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'approved_by') THEN
        ALTER TABLE public.leave_requests ADD COLUMN approved_by UUID REFERENCES public.profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'rejected_at') THEN
        ALTER TABLE public.leave_requests ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'rejected_by') THEN
        ALTER TABLE public.leave_requests ADD COLUMN rejected_by UUID REFERENCES public.profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'reviewer_note') THEN
        ALTER TABLE public.leave_requests ADD COLUMN reviewer_note TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'attachment_url') THEN
        ALTER TABLE public.leave_requests ADD COLUMN attachment_url TEXT;
    END IF;
END $$;

-- 2. Function to calculate days (Simple: Date Diff + 1)
-- In a real production app, we would exclude weekends/holidays using a calendar table.
-- For now, we assume simple calendar days or that the input dates already account for work days.
CREATE OR REPLACE FUNCTION public.calculate_leave_days(start_date DATE, end_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN (end_date - start_date) + 1;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to deduct leave balance
CREATE OR REPLACE FUNCTION public.handle_leave_approval()
RETURNS TRIGGER AS $$
DECLARE
    days_count INTEGER;
BEGIN
    -- Only proceed if status changed to 'approved'
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
        -- Calculate days
        days_count := public.calculate_leave_days(NEW.start_date, NEW.end_date);
        
        -- Update Profile
        UPDATE public.profiles
        SET allowed_leave_days = allowed_leave_days - days_count
        WHERE id = NEW.employee_id;
        
        -- Set approved_at if not set (though app should set it, safe fallback)
        IF NEW.approved_at IS NULL THEN
            NEW.approved_at := NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS on_leave_approval ON public.leave_requests;

CREATE TRIGGER on_leave_approval
    BEFORE UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_leave_approval();
