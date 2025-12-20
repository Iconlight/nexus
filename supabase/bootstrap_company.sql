-- ============================================
-- COMPANY ONBOARDING BOOTSTRAP SCRIPT
-- ============================================
-- This script is a TEMPLATE - DO NOT RUN AS-IS
-- Follow the steps below to manually create a company

-- ============================================
-- STEP-BY-STEP INSTRUCTIONS
-- ============================================

-- STEP 1: Create the company
-- Replace 'Your Company Name' with the actual company name
INSERT INTO public.companies (name, subscription_status)
VALUES (
    'Your Company Name', -- CHANGE THIS
    'active'
)
RETURNING id; -- Copy this UUID for Step 3

-- After running Step 1, you will get a company UUID like:
-- 12345678-1234-1234-1234-123456789abc
-- COPY THIS UUID!

-- ============================================
-- STEP 2: Create the admin user in Supabase Auth
-- ============================================
-- You MUST do this via Supabase Dashboard:
-- 1. Go to: Authentication > Users > Add User
-- 2. Enter email and password
-- 3. Set "Auto Confirm Email" to YES
-- 4. Click "Create User"
-- 5. COPY the user's UUID from the users table

-- ============================================
-- STEP 3: Create the profile (linking user to company)
-- ============================================
-- Replace the UUIDs and details below with actual values

-- EXAMPLE (DO NOT RUN THIS):
-- INSERT INTO public.profiles (
--     id,
--     company_id,
--     first_name,
--     last_name,
--     email,
--     phone,
--     role,
--     is_active
-- )
-- VALUES (
--     'USER_UUID_FROM_STEP_2'::uuid,
--     'COMPANY_UUID_FROM_STEP_1'::uuid,
--     'John',
--     'Doe',
--     'admin@company.com',
--     '+1234567890',
--     'admin',
--     true
-- );

-- ============================================
-- ALTERNATIVE: Use this function for automated onboarding
-- ============================================

CREATE OR REPLACE FUNCTION public.bootstrap_company(
    p_company_name TEXT,
    p_admin_email TEXT,
    p_admin_password TEXT,
    p_admin_first_name TEXT,
    p_admin_last_name TEXT,
    p_admin_phone TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_user_id UUID;
    v_result jsonb;
BEGIN
    -- Create company
    INSERT INTO public.companies (name, subscription_status)
    VALUES (p_company_name, 'active')
    RETURNING id INTO v_company_id;

    -- Note: Creating auth user requires Supabase Admin API or Dashboard
    -- This function assumes the auth user is created separately
    -- and you pass the user_id to link the profile
    
    -- Return the company ID for manual linking
    v_result := jsonb_build_object(
        'success', true,
        'company_id', v_company_id,
        'message', 'Company created. Now create admin user in Supabase Auth Dashboard and link with this company_id'
    );
    
    RETURN v_result;
END;
$$;

-- Example usage:
-- SELECT public.bootstrap_company(
--     'Acme Corporation',
--     'admin@acme.com',
--     'secure-password',
--     'John',
--     'Doe',
--     '+1234567890'
-- );
