# Sign Out Button Not Working - Debug Steps

## What I've Fixed

1. ✅ Updated `AuthContext.tsx` to add better logging and error handling
2. ✅ Sign out now clears local session state

## To Debug

**Open browser console (F12) and click the Sign Out button.**

You should see these logs:
```
Dashboard - Sign out button pressed
AuthContext - Signing out...
AuthContext - Signed out successfully
```

If you see errors instead, share them with me.

## Alternative: Manual Sign Out

If the button still doesn't work, manually sign out:

1. Open DevTools (F12)
2. Go to Console tab
3. Run this command:
```javascript
localStorage.clear();
location.reload();
```

This will clear all local storage and reload the page, effectively signing you out.

## Check if RLS is Disabled

Did you run the SQL to disable RLS? Check in Supabase:

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'companies');
```

If `rowsecurity` is `true`, RLS is still enabled. Run:

```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
```

## After Disabling RLS

1. Refresh the browser (Ctrl+R)
2. You should see the dashboard load properly
3. Check console for any errors

Let me know what you see!
