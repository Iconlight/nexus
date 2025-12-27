-- Enable RLS for teams insert
-- Only Admins, CEOs, HR, and Managers can create teams in their own company

DROP POLICY IF EXISTS "Management can create teams" ON public.teams;

CREATE POLICY "Management can create teams" ON public.teams
    FOR INSERT
    WITH CHECK (
        -- User must be in the same company and have appropriate role
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND company_id = public.teams.company_id
            AND role IN ('admin', 'ceo', 'hr', 'manager')
        )
    );
