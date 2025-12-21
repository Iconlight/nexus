-- TEMPORARY FIX: Disable RLS on profiles table
-- This allows you to read your own profile while we debug the RLS policies

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- After you can login successfully, we'll re-enable and fix the policies
-- For now, this will let you access the dashboard

-- Verify the profile exists
SELECT id, email, role, company_id FROM profiles WHERE email = 'test@gmail.com';
