# Troubleshooting Company Signup

## Issue: "Nothing happens" when creating account

### Step 1: Check Environment Variables

**Problem**: The `.env` file was in the wrong location.

**Solution**: I've created `nexus/.env` with your Supabase credentials.

**Verify**:
1. Stop the Expo dev server (Ctrl+C)
2. Clear cache: `npx expo start -c`
3. Check console logs when you try to signup

### Step 2: Check Edge Function Deployment

**Verify the function is deployed**:
```bash
supabase functions list
```

You should see `company-signup` in the list.

**Check function logs**:
```bash
supabase functions logs company-signup
```

### Step 3: Test the Edge Function Directly

Use curl or Postman to test:

```bash
curl -X POST \
  'https://kiqwwzwjrqzcovvgugft.supabase.co/functions/v1/company-signup' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcXd3endqcnF6Y292dmd1Z2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMzE0MzksImV4cCI6MjA4MTgwNzQzOX0.xnQUesMtvTuWApiQy2JQTR1ysp5yWmJdmrCLpvLYr84' \
  -H 'Content-Type: application/json' \
  -d '{
    "companyName": "Test Company",
    "adminEmail": "test@example.com",
    "adminPassword": "testpassword123",
    "adminFirstName": "Test",
    "adminLastName": "User",
    "adminPhone": "+1234567890"
  }'
```

### Step 4: Check Console Logs

I've added detailed logging to the signup screen. When you try to signup, check the console for:

```
Supabase URL: https://...
Has Anon Key: true
Calling Edge Function: https://...
Request body: {...}
Response status: 200
Response text: {...}
```

### Step 5: Common Issues

#### Issue: "Supabase configuration missing"
- **Cause**: `.env` file not loaded
- **Fix**: Restart dev server with `npx expo start -c`

#### Issue: 404 Not Found
- **Cause**: Edge function not deployed
- **Fix**: Run `supabase functions deploy company-signup`

#### Issue: 500 Internal Server Error
- **Cause**: Error in Edge Function code
- **Fix**: Check logs with `supabase functions logs company-signup`

#### Issue: CORS error
- **Cause**: Edge Function not handling CORS properly
- **Fix**: Already handled in the function code

#### Issue: "Failed to create company"
- **Cause**: Database error (tables not created)
- **Fix**: Run `schema.sql` and `rls_policies.sql` in Supabase SQL Editor

### Step 6: Alternative - Manual Setup

If the Edge Function still doesn't work, use Method 2 (Manual Setup):

1. Go to Supabase Dashboard
2. Create company manually in `companies` table
3. Create user in Authentication
4. Link them in `profiles` table

See `ONBOARDING_GUIDE.md` for detailed steps.

### Step 7: Test Connection Screen

I've created a test screen at `app/(auth)/test.tsx`.

Navigate to it in your app to verify Supabase connection.

## Next Steps

1. **Restart the app** with cache cleared
2. **Try signup again** and check console logs
3. **Share the console output** if it still doesn't work
4. **Check Edge Function logs** in Supabase dashboard
