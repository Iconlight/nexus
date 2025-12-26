# Geo-Fencing Setup Guide

## Overview
The geo-fencing feature allows admins to set an office location and radius. Employees can only check in when their GPS location is within this radius.

## Manual Setup Steps

### 1. Run Database Migrations
You need to run two SQL scripts in your Supabase SQL Editor to enable this feature.

**Script 1: Add Columns**
Copy content from: `supabase/add_geofencing_migration.sql`

**Script 2: Add Functions**
Copy content from: `supabase/geofencing_functions.sql`

run them in the Supabase Dashboard -> SQL Editor.

### 2. Verify PostGIS Extension
Ensure the PostGIS extension is enabled in your Supabase project (Database -> Extensions). It usually is by default, but required for `GEOGRAPHY` types.

## How to Test

### Admin Setup
1. Log in as an Admin/CEO.
2. Go to **Dashboard** -> **Company Settings**.
3. Allow location permissions if prompted.
4. Click **Capture Current Location** or enter coordinates manually.
5. Set a radius (e.g., 200 meters).
6. Click **Save Settings**.

### Employee Check-in
1. Log in as an Employee.
2. Go to **Check In**.
3. You should see a new "Office Distance" card.
4. If within range: Green card, Check In button enabled.
5. If out of range: Orange card, Check In button disabled.

## Troubleshooting
- **"Function not found"**: Ensure you ran the `geofencing_functions.sql` script.
- **"Permission denied"**: Check your RLS policies (though currently disabled for dev).
- **Location accuracy**: GPS inside buildings can be inaccurate. Try setting a larger radius (e.g., 100m+) for testing.
