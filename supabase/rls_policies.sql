-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user profile
-- Note: This function is not currently used in the policies below
-- If needed in the future, it would require proper JSON path handling
-- CREATE OR REPLACE FUNCTION public.get_my_claim(claim TEXT) 
-- RETURNS TEXT AS $$
--   SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->claim, 'null'::jsonb)::text
-- $$ LANGUAGE sql STABLE;


-- 1. COMPANIES
-- Only internal super admins or the creator (if we had a SaaS sign-up flow) can view companies normally.
-- For this app, employees can view THEIR company.
DROP POLICY IF EXISTS "Employees can view own company" ON public.companies;
CREATE POLICY "Employees can view own company" ON public.companies
    FOR SELECT
    USING (id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

-- 2. PROFILES
-- Employees can view profiles in their company.
DROP POLICY IF EXISTS "View profiles in same company" ON public.profiles;
CREATE POLICY "View profiles in same company" ON public.profiles
    FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Only HR and Admins can update profiles
DROP POLICY IF EXISTS "HR/Admins can update profiles" ON public.profiles;
CREATE POLICY "HR/Admins can update profiles" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'hr', 'ceo')
            AND company_id = public.profiles.company_id
        )
    );

-- 3. TEAMS
DROP POLICY IF EXISTS "View teams in same company" ON public.teams;
CREATE POLICY "View teams in same company" ON public.teams
    FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

-- 4. ATTENDANCE LOGS
-- Employees view their own.
DROP POLICY IF EXISTS "View own attendance" ON public.attendance_logs;
CREATE POLICY "View own attendance" ON public.attendance_logs
    FOR SELECT
    USING (employee_id = auth.uid());

-- Managers view their team's attendance.
DROP POLICY IF EXISTS "Managers view team attendance" ON public.attendance_logs;
CREATE POLICY "Managers view team attendance" ON public.attendance_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_managers tm
            JOIN public.profiles p ON p.team_id = tm.team_id
            WHERE tm.manager_id = auth.uid()
            AND p.id = public.attendance_logs.employee_id
        )
    );

-- HR/Admins view all.
DROP POLICY IF EXISTS "Admins view all attendance" ON public.attendance_logs;
CREATE POLICY "Admins view all attendance" ON public.attendance_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'hr', 'ceo')
            AND company_id = public.attendance_logs.company_id
        )
    );

-- Employees can insert their own check-ins (usually handled via Edge Function for security, but policy needed if direct insert).
DROP POLICY IF EXISTS "Employees can insert attendance" ON public.attendance_logs;
CREATE POLICY "Employees can insert attendance" ON public.attendance_logs
    FOR INSERT
    WITH CHECK (employee_id = auth.uid());

-- 5. LEAVE REQUESTS
-- View own
DROP POLICY IF EXISTS "View own leave" ON public.leave_requests;
CREATE POLICY "View own leave" ON public.leave_requests
    FOR SELECT
    USING (employee_id = auth.uid());

-- Managers view team leave
DROP POLICY IF EXISTS "Managers view team leave" ON public.leave_requests;
CREATE POLICY "Managers view team leave" ON public.leave_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_managers tm
            JOIN public.profiles p ON p.team_id = tm.team_id
            WHERE tm.manager_id = auth.uid()
            AND p.id = public.leave_requests.employee_id
        )
    );

-- HR/Admins view all
DROP POLICY IF EXISTS "Admins view all leave" ON public.leave_requests;
CREATE POLICY "Admins view all leave" ON public.leave_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'hr', 'ceo')
            AND company_id = public.leave_requests.company_id
        )
    );

-- Insert own
DROP POLICY IF EXISTS "Insert own leave" ON public.leave_requests;
CREATE POLICY "Insert own leave" ON public.leave_requests
    FOR INSERT
    WITH CHECK (employee_id = auth.uid());

-- Approve: Managers, HR, Admin
DROP POLICY IF EXISTS "Management can update leave" ON public.leave_requests;
CREATE POLICY "Management can update leave" ON public.leave_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'hr', 'ceo', 'manager')
            AND company_id = public.leave_requests.company_id
        )
    );

-- 6. PAYROLL (Highly sensitive)
-- Employee views own published records
DROP POLICY IF EXISTS "View own payroll" ON public.payroll_records;
CREATE POLICY "View own payroll" ON public.payroll_records
    FOR SELECT
    USING (
        employee_id = auth.uid() 
        AND status = 'published'
    );

-- Finance/HR/Admin view all
DROP POLICY IF EXISTS "Finance view all payroll" ON public.payroll_records;
CREATE POLICY "Finance view all payroll" ON public.payroll_records
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'hr', 'finance', 'ceo')
            AND company_id = public.payroll_records.company_id
        )
    );
