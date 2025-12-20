# How Admin/CEO Creates Company Account - Summary

## Question
"How will an admin or CEO create an account for the company?"

## Answer

I've implemented **three methods** to solve this bootstrap problem:

---

## 🎯 Method 1: Self-Service Signup (RECOMMENDED)

### What I Built
1. **Signup Screen** (`app/(auth)/signup.tsx`)
   - Beautiful form for company registration
   - Fields: Company name, admin details, password
   - Accessible from login screen via "Create Company Account" button

2. **Edge Function** (`supabase/functions/company-signup/index.ts`)
   - Serverless function that runs on Supabase
   - Uses admin privileges to create:
     - Company record
     - Auth user account
     - Profile with admin role
   - Includes rollback on failure (atomic transaction)

### How It Works
```
User fills form → Calls Edge Function → Creates company + admin → Redirects to login
```

### To Deploy
```bash
cd nexus
supabase functions deploy company-signup
```

---

## 🛠️ Method 2: Manual Setup (FOR TESTING)

### Steps
1. Go to Supabase Dashboard
2. Create company in `companies` table
3. Create user in Authentication
4. Create profile linking the two

### When to Use
- Testing during development
- One-off setups
- When Edge Function isn't deployed yet

### Full Guide
See `nexus/ONBOARDING_GUIDE.md` for detailed steps

---

## 📝 Method 3: SQL Script (FOR BULK)

### What I Provided
- `supabase/bootstrap_company.sql`
- Template SQL for creating company + profile
- Requires manual auth user creation

### When to Use
- Migrating existing companies
- Bulk onboarding
- Custom setup scenarios

---

## 🔒 Security Features

All methods ensure:
- ✅ Company isolation (RLS policies)
- ✅ Secure password handling
- ✅ Email uniqueness
- ✅ Admin role assignment
- ✅ No cross-company data leaks

---

## 📱 User Experience

### For the Admin/CEO:
1. Open Nexus app
2. Tap "Create Company Account"
3. Fill in company and personal details
4. Submit
5. Login with new credentials
6. Start inviting employees!

---

## Files Created

| File | Purpose |
|------|---------|
| `app/(auth)/signup.tsx` | Company signup UI |
| `supabase/functions/company-signup/index.ts` | Edge Function for account creation |
| `supabase/bootstrap_company.sql` | SQL template for manual setup |
| `ONBOARDING_GUIDE.md` | Complete documentation |

---

## Next Steps After Company Creation

Once admin logs in, they can:
1. ✅ Access dashboard
2. 📋 Create teams
3. 👥 Invite employees (via admin panel - to be built)
4. ⚙️ Configure company settings
5. 📊 View reports

---

## Why This Approach?

The RAD says "Account creation initiated only by Company Admin" but doesn't explain how the FIRST admin is created. This is the classic "who creates the creator?" problem.

My solution:
- **Production**: Self-service signup (scalable, automated)
- **Development**: Manual dashboard (quick testing)
- **Enterprise**: SQL scripts (bulk migration)

All three methods create the same secure, isolated company environment! 🎉
