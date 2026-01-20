-- Migration: Secure Publish All Payrolls Logic
-- Description: Creates a secure RPC function to publish all draft payrolls for the current user's company.

CREATE OR REPLACE FUNCTION public.publish_all_payrolls(p_month DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to ensure update works, but scope is strictly limited by logic below
AS $$
DECLARE
    v_company_id UUID;
    v_user_id UUID;
BEGIN
    -- 1. Get current user ID
    v_user_id := auth.uid();
    
    -- 2. Verify user exists and get their company_id
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE id = v_user_id;

    -- 3. If no company found (or user not found), raise error
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'User does not belong to a company or not found.';
    END IF;

    -- 4. Perform the update strictly for this company_id and month
    --    Only update records that are currently 'draft'
    UPDATE public.payroll_records
    SET status = 'published',
        updated_at = NOW()
    WHERE company_id = v_company_id
    AND month = p_month
    AND status = 'draft';

END;
$$;
