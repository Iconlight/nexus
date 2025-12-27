-- RLS FIX for Department Reports
-- (Strict Privacy: Drafts are ONLY visible/modifiable by Author)

-- 1. Drop ALL potential existing policies to ensure clean slate
DROP POLICY IF EXISTS "Managers view own reports, Admins view all" ON public.department_reports;
DROP POLICY IF EXISTS "Managers manage reports" ON public.department_reports;
DROP POLICY IF EXISTS "View department reports" ON public.department_reports;
DROP POLICY IF EXISTS "Manage own reports" ON public.department_reports;

-- 2. Unified Strict Policy
-- This applies to SELECT, INSERT, UPDATE, DELETE.
-- Logic:
--  - Author: Can do anything with their own reports (Draft or Submitted).
--  - Admin/Manager: Can ONLY see/manage reports that are 'submitted'.
--    (This ensures Drafts remain 100% private to the author, even from Admins)

CREATE POLICY "Strict Report Access" ON public.department_reports
    FOR ALL
    USING (
        -- 1. Author Access (Full Access)
        author_id = auth.uid()
        
        OR
        
        -- 2. Public/Shared Access (Only Submitted Reports)
        (
            status = 'submitted' 
            AND (
                -- Manager of the team
                (EXISTS (SELECT 1 FROM public.team_managers WHERE manager_id = auth.uid() AND team_id = public.department_reports.team_id))
                OR
                -- Admin/HR/CEO
                (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'hr', 'ceo') AND company_id = public.department_reports.company_id))
            )
        )
    );

