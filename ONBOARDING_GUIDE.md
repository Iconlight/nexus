# Company Onboarding Guide

## Overview
This guide explains how to set up a new company and admin account in the Nexus application.

## Three Methods for Company Onboarding

### Method 1: Using the Mobile App (Recommended for Production)

1. **Deploy the Edge Function**
   ```bash
   cd nexus
   supabase functions deploy company-signup
   ```

2. **Users can self-register**:
   - Open the Nexus app
   - On the login screen, tap "Create Company Account"
   - Fill in:
     - Company Name
     - Admin First Name & Last Name
     - Admin Email
     - Phone (optional)
     - Password
   - The system will automatically:
     - Create the company
     - Create the admin auth account
     - Link the profile with admin role

### Method 2: Manual Setup via Supabase Dashboard (For Testing)

1. **Create Company Record**:
   - Go to Supabase Dashboard → Table Editor → `companies`
   - Click "Insert row"
   - Fill in:
     - `name`: Your company name
     - `subscription_status`: 'active'
   - Copy the generated `id` (UUID)

2. **Create Admin User**:
   - Go to Authentication → Users → Add User
   - Enter:
     - Email
     - Password
     - Auto Confirm: Yes
   - Copy the user's `id` (UUID)

3. **Create Profile**:
   - Go to Table Editor → `profiles`
   - Click "Insert row"
   - Fill in:
     - `id`: The user UUID from step 2
     - `company_id`: The company UUID from step 1
     - `first_name`: Admin's first name
     - `last_name`: Admin's last name
     - `email`: Same as auth email
     - `phone`: Optional
     - `role`: 'admin' or 'ceo'
     - `is_active`: true

### Method 3: SQL Script (For Bulk Setup)

1. **Run the bootstrap script**:
   - Open `nexus/supabase/bootstrap_company.sql`
   - Replace the placeholder values:
     - Company name
     - Admin details
   - Execute in Supabase SQL Editor

2. **Create the auth user separately** via Supabase Dashboard (see Method 2, step 2)

3. **Update the profile** with the correct user UUID

## After Company Setup

### Admin First Login
1. Open the Nexus app
2. Enter the admin email and password
3. You'll be redirected to the Dashboard

### Adding Employees
Once logged in as admin, you can:
1. Navigate to "Manage Employees" (to be implemented)
2. Click "Invite Employee"
3. Fill in employee details
4. System sends invitation email
5. Employee sets up their password on first login

## Security Notes

- **Service Role Key**: The Edge Function uses the service role key to create users. Keep this secret!
- **RLS Policies**: All data is protected by Row Level Security
- **Company Isolation**: Each company can only see their own data
- **Role Enforcement**: Permissions are checked on every database operation

## Troubleshooting

### "Email already exists"
- The email is already registered in another company
- Use a different email or contact support

### "Failed to create company"
- Check Supabase logs for detailed error
- Ensure PostGIS extension is enabled
- Verify all required fields are filled

### "Cannot login after signup"
- Wait a few seconds for database sync
- Check if email confirmation is required
- Verify the profile was created correctly

## Next Steps

After company setup:
1. ✅ Admin can login
2. ⏭️ Create teams
3. ⏭️ Invite employees
4. ⏭️ Configure attendance settings
5. ⏭️ Set up leave policies
