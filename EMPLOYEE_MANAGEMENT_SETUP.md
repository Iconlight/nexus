# Employee Management Enhancement - Setup Guide

## Overview
This guide walks you through setting up the enhanced employee management system with job details, EmailJS integration, and employee removal capabilities.

## Step 1: Run Database Migration

Execute the migration script in Supabase SQL Editor:

1. Go to your Supabase Dashboard → SQL Editor
2. Open `supabase/add_employee_fields_migration.sql`
3. Copy and paste the contents
4. Click "Run" to execute

This adds the following columns to the `profiles` table:
- `job_title` (TEXT)
- `working_days_per_week` (INTEGER, default: 5)
- `working_hours_per_day` (NUMERIC, default: 8)
- `allowed_leave_days` (INTEGER, default: 21)

## Step 2: Create EmailJS Template

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Navigate to Email Templates
3. Create a new template with ID: `template_employee_invite`
4. Use the following template variables:

```
Subject: Welcome to {{company_name}} - Your Account Details

Dear {{to_name}},

Welcome to {{company_name}}! Your employee account has been created.

Login Details:
- Username: {{username}}
- Email: {{to_email}}
- Temporary Password: {{temp_password}}
- Login URL: {{login_url}}

Please login and change your password immediately.

Job Details:
- Title: {{job_title}}
- Working Days: {{working_days}} days/week
- Working Hours: {{working_hours}} hours/day
- Annual Leave: {{leave_days}} days

Best regards,
{{company_name}} HR Team
```

## Step 3: Deploy Updated Edge Function

```bash
cd nexus
npx supabase functions deploy invite-employee
```

## Step 4: Install Dependencies

```bash
npm install
```

This installs the `@emailjs/browser` package.

## Step 5: Test the System

### Test Employee Invitation:
1. Login as admin
2. Go to "Manage Employees"
3. Click "Invite Employee"
4. Fill in all fields including job details and base salary
5. Submit
6. Check employee's email for invitation

### Test Employee Removal:
1. Click "Remove" on an employee
2. Confirm the action
3. Employee should be marked as inactive
4. Toggle "Show Inactive" to see removed employees

### Verify Payroll Creation:
1. After inviting employee with base salary
2. Go to "Manage Payroll"
3. Check for draft payroll record for the new employee

## Features

### Enhanced Invite Form
- Job Title (required)
- Working Days/Week (default: 5)
- Hours/Day (default: 8)
- Leave Days/Year (default: 21)
- Base Salary (required)

### Email Invitation
- Sent automatically via EmailJS
- Contains login credentials
- Includes job details
- No temp password shown in UI (sent via email only)

### Employee Removal
- Soft delete (sets is_active = false)
- Preserves historical data
- Confirmation dialog
- Filter to show/hide inactive employees

### Automatic Payroll
- Draft payroll created when base salary provided
- Uses current month
- Net salary = base salary (no deductions initially)

## Troubleshooting

**Email not sending:**
- Check EmailJS service ID and keys in `.env`
- Verify template ID matches `template_employee_invite`
- Check EmailJS dashboard for error logs

**Migration fails:**
- Ensure you're running in the correct database
- Check for existing columns with same names
- Verify you have admin permissions

**Payroll not created:**
- Check Edge Function logs in Supabase
- Ensure base salary was provided
- Verify payroll_records table exists

## Next Steps

After setup:
1. Test complete employee lifecycle
2. Customize email template as needed
3. Configure app URL in Edge Function environment
4. Enable RLS policies when ready for production
