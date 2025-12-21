# Nexus - Workforce Operations Application

A comprehensive workforce management system built with Expo React Native and Supabase.

## 🚀 Features

### For All Employees
- ✅ **Attendance Tracking** - GPS-based check-in/check-out
- ✅ **Leave Management** - Request and track leave
- ✅ **Payslips** - View salary breakdowns
- ✅ **Profile Management** - Update personal information

### For Managers & HR
- ✅ **Leave Approvals** - Review and approve/reject leave requests
- ✅ **Team Management** - Create and organize teams
- ✅ **Employee Oversight** - View team attendance and leave

### For Admins & Finance
- ✅ **Employee Management** - Invite and manage employees
- ✅ **Role Management** - Assign and modify user roles
- ✅ **Payroll Processing** - Create and publish payroll
- ✅ **Company Settings** - Manage company-wide settings

## 📋 Tech Stack

- **Frontend**: Expo React Native, TypeScript, Expo Router
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Location Services**: expo-location
- **Document Handling**: expo-document-picker

## 🏗️ Project Structure

```
nexus/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (app)/             # Protected app screens
│   │   ├── dashboard.tsx
│   │   ├── employees.tsx
│   │   ├── check-in.tsx
│   │   ├── leave.tsx
│   │   ├── approvals.tsx
│   │   ├── teams.tsx
│   │   ├── payroll.tsx
│   │   └── payslips.tsx
│   └── index.tsx          # Root redirect
├── src/
│   ├── context/           # React Context providers
│   │   └── AuthContext.tsx
│   └── services/          # API services
│       └── supabase.ts
├── supabase/
│   ├── schema.sql         # Database schema
│   ├── rls_policies.sql   # Row Level Security
│   └── functions/         # Edge Functions
│       ├── company-signup/
│       └── invite-employee/
├── tasks.md               # Project task tracking
├── DEPLOYMENT.md          # Deployment guide
└── README.md             # This file
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/nexus.git
cd nexus
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

4. **Set up Supabase**

- Create a new Supabase project
- Run `supabase/schema.sql` in SQL Editor
- Deploy Edge Functions (see DEPLOYMENT.md)

5. **Start development server**
```bash
npm start
```

## 📱 Usage

### First Time Setup

1. Open the app
2. Click "Create Company Account"
3. Fill in company and admin details
4. You'll be auto-logged in as admin

### Admin Workflow

1. **Invite Employees**
   - Go to "Manage Employees"
   - Click "Invite Employee"
   - Fill in details and select role
   - Share temporary password with employee

2. **Create Teams**
   - Go to "Manage Teams"
   - Create teams for organization

3. **Process Payroll**
   - Go to "Manage Payroll"
   - Create payroll records
   - Publish to make visible to employees

### Employee Workflow

1. **Check In**
   - Go to "Check In"
   - Allow location access
   - Click "Check In Now"

2. **Request Leave**
   - Go to "Request Leave"
   - Select leave type and dates
   - Submit request

3. **View Payslips**
   - Go to "View Payslips"
   - See salary breakdowns

## 🔒 Security

- **Row Level Security**: Company data isolation (currently disabled for development)
- **Role-Based Access**: Different permissions for different roles
- **Session Management**: Secure authentication with Supabase Auth
- **Edge Functions**: Server-side logic for sensitive operations

## 📊 Current Status

**Version**: 0.1.0  
**Status**: Active Development

### Completed Features (9/10)
- ✅ Authentication & Onboarding
- ✅ Dashboard
- ✅ Employee Management
- ✅ Attendance Check-In
- ✅ Leave Management
- ✅ Leave Approvals
- ✅ Team Management
- ✅ Payroll Management
- ✅ Payslips

### Pending Features
- ⏳ Disciplinary Cases
- ⏳ RLS Policy Fixes
- ⏳ Email Notifications
- ⏳ Document Upload to Storage

See `tasks.md` for detailed progress tracking.

## 🐛 Known Issues

1. **RLS Disabled**: Currently disabled for testing - needs to be enabled for production
2. **Email Notifications**: Employee invites don't send emails - admin must manually share credentials
3. **Document Upload**: Leave request documents save placeholder, not actual files

## 📖 Documentation

- [Deployment Guide](DEPLOYMENT.md) - How to deploy to production
- [Task Tracking](tasks.md) - Detailed progress and remaining work
- [Walkthrough](walkthrough.md) - Feature walkthrough and fixes
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📄 License

Proprietary - All rights reserved

## 👥 Team

Developed by Ariel Zuriel

---

**Last Updated**: 2025-12-21
