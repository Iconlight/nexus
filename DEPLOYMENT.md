# Nexus Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- Supabase account
- Git installed

## 1. Supabase Setup

### Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: `nexus-production`
   - Database Password: (save this securely)
   - Region: Choose closest to your users

### Run Database Schema

1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `supabase/schema.sql`
3. Execute the SQL
4. Verify tables are created in Table Editor

### Configure Row Level Security (Optional - Currently Disabled)

**Note**: RLS is currently disabled for development. To enable:

1. Go to SQL Editor
2. Run:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- Repeat for all tables
```

3. Copy contents of `supabase/rls_policies.sql`
4. Execute the SQL
5. Test with different user roles

### Deploy Edge Functions

#### company-signup Function

```bash
cd nexus
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy company-signup
```

#### invite-employee Function

```bash
npx supabase functions deploy invite-employee
```

### Get Supabase Credentials

1. Go to Project Settings → API
2. Copy:
   - Project URL (SUPABASE_URL)
   - Anon/Public Key (SUPABASE_ANON_KEY)
   - Service Role Key (SUPABASE_SERVICE_ROLE_KEY) - **Keep this secret!**

## 2. Environment Variables

### Create `.env` File

Create `.env` in the `nexus/` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important**: Never commit `.env` to Git!

### Configure Edge Functions Environment

Set the Service Role Key for Edge Functions:

```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 3. Local Development

### Install Dependencies

```bash
cd nexus
npm install
```

### Start Development Server

```bash
npm start
# or
npx expo start
```

### Run on Different Platforms

- **Web**: Press `w` in terminal
- **iOS**: Press `i` (requires Mac with Xcode)
- **Android**: Press `a` (requires Android Studio)
- **Physical Device**: Scan QR code with Expo Go app

## 4. Testing

### Create First Admin Account

1. Open the app
2. Click "Create Company Account"
3. Fill in:
   - Company Name
   - Admin details
   - Email & Password
4. Click "Create Account"
5. You should be auto-logged in

### Test Core Workflows

1. **Employee Management**:
   - Go to "Manage Employees"
   - Invite a test employee
   - Copy the temporary password
   - Sign out and login as employee

2. **Leave Request Flow**:
   - As employee: Submit leave request
   - Sign out
   - Login as admin/manager
   - Go to "Approve Requests"
   - Approve/reject the request

3. **Payroll Flow**:
   - As admin/finance: Go to "Manage Payroll"
   - Create payroll for employee
   - Publish payroll
   - Sign out and login as employee
   - View payslip

## 5. Production Build

### Web Deployment

```bash
npx expo export:web
# Deploy the web-build folder to your hosting service
```

### iOS Build (Requires Apple Developer Account)

```bash
eas build --platform ios
```

### Android Build

```bash
eas build --platform android
```

## 6. Post-Deployment

### Enable RLS (Important for Production!)

1. Test all user flows with RLS disabled
2. Once confirmed working, enable RLS:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinary_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

3. Test again with different user roles
4. Fix any access issues in `supabase/rls_policies.sql`

### Configure Email Notifications (Optional)

For employee invites to send emails:

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Customize "Invite User" template
3. Update Edge Function to trigger email send

### Monitor Usage

1. Supabase Dashboard → Database → Usage
2. Check API requests, storage, bandwidth
3. Upgrade plan if needed

## 7. Troubleshooting

### Common Issues

**Issue**: "Profile not found" error
- **Solution**: Check if RLS is blocking access. Temporarily disable RLS to test.

**Issue**: 401 Unauthorized on employee invite
- **Solution**: Ensure session token is being passed, not anon key.

**Issue**: Edge Function not found
- **Solution**: Redeploy function: `npx supabase functions deploy FUNCTION_NAME`

**Issue**: Environment variables not loading
- **Solution**: Ensure `.env` is in `nexus/` directory, restart dev server.

### Debug Mode

Enable detailed logging:

```typescript
// In src/services/supabase.ts
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    debug: true
  }
});
```

## 8. Maintenance

### Database Backups

Supabase automatically backs up your database. To manually backup:

1. Go to Database → Backups
2. Click "Create Backup"

### Update Dependencies

```bash
npm update
npx expo upgrade
```

### Monitor Logs

- **Edge Functions**: Supabase Dashboard → Edge Functions → Logs
- **Database**: Supabase Dashboard → Database → Logs
- **App Crashes**: Use Sentry or similar service

---

## Support

For issues:
1. Check `TROUBLESHOOTING.md`
2. Review Supabase logs
3. Check browser console for errors
4. Verify environment variables

**Last Updated**: 2025-12-21
