# Quick Fix for Profile Not Found Error

## Problem
You're seeing "Profile not found" error after signup. This means either:
1. The profile wasn't created during signup
2. RLS policies are blocking you from reading your own profile

## Solution 1: Check if Profile Exists

Run this in Supabase SQL Editor:

```sql
-- Check if your profile exists
SELECT * FROM profiles WHERE email = 'your-email@example.com';

-- If it exists, check the auth user
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

## Solution 2: Create Profile Manually

If the profile doesn't exist, run this:

```sql
-- First, get your auth user ID
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Then create the profile (replace the UUIDs with actual values)
INSERT INTO profiles (id, company_id, first_name, last_name, email, role, is_active)
VALUES (
  'YOUR_AUTH_USER_ID_HERE'::uuid,
  'YOUR_COMPANY_ID_HERE'::uuid,
  'Your First Name',
  'Your Last Name',
  'your-email@example.com',
  'admin',
  true
);
```

## Solution 3: Fix RLS Policies

The RLS policies might be too restrictive. Run this to temporarily disable RLS for testing:

```sql
-- TEMPORARY: Disable RLS on profiles table for testing
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable it:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

## Solution 4: Check Edge Function Logs

In Supabase Dashboard:
1. Go to Edge Functions
2. Click on `company-signup`
3. View logs to see if there were any errors during signup

## Solution 5: Re-deploy Edge Function

The Edge Function might not be deployed correctly:

```bash
cd nexus
supabase functions deploy company-signup
```

## Quick Test

After trying the fixes above, refresh your app and check the console logs. You should see:

```
Dashboard - Loading data for user: [your-user-id]
Dashboard - Profile loaded successfully: {...}
```

If you still see errors, share the console output with me.
