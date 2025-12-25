# Email Invitation Issue - Troubleshooting Guide

## Problem
Emails are not being sent when inviting employees. The invite succeeds (status 200) but no email is received.

## Root Cause
The updated Edge Function with EmailJS integration has not been deployed to Supabase yet. The current deployed version is still the old one without email functionality.

## Solution

### Step 1: Deploy the Updated Edge Function

```bash
cd "c:\Users\Administrator\Documents\Ariel's workspace\nexus"
npx supabase functions deploy invite-employee
```

### Step 2: Set Environment Variables in Supabase

The Edge Function needs these environment variables set in Supabase:

```bash
npx supabase secrets set EMAILJS_SERVICE_ID=service_89mlz15
npx supabase secrets set EMAILJS_PRIVATE_KEY=mpyoyRmPLIKMjh4d43ijU
```

### Step 3: Create EmailJS Template

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Navigate to Email Templates
3. Create a new template with ID: `template_employee_invite`
4. Use this template:

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

### Step 4: Test

1. Restart your Expo dev server
2. Invite a new employee with all job details
3. Check the employee's email inbox

## Verification

After deployment, check the Supabase Edge Function logs:
1. Go to Supabase Dashboard → Edge Functions → invite-employee → Logs
2. Look for email sending logs
3. If you see "Failed to send email", check the EmailJS template ID and credentials

## Current Status

✅ Frontend updated with proper labels and form fields
✅ Edge Function code updated with EmailJS integration
⏳ Edge Function deployment (manual step required)
⏳ EmailJS template creation (manual step required)
⏳ Environment variables configuration (manual step required)
