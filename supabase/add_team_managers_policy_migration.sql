-- Enable RLS for team_managers (if not already enabled)
ALTER TABLE public.team_managers ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can view team managers
-- Needed so everyone can see who leads which team
DROP POLICY IF EXISTS "Everyone can view team managers" ON public.team_managers;
CREATE POLICY "Everyone can view team managers" ON public.team_managers
    FOR SELECT
    USING (true);

-- Policy 2: Admins/HR/CEO can manage team managers
-- Only these roles should be able to assign or remove leaders
DROP POLICY IF EXISTS "Admins manage team managers" ON public.team_managers;
CREATE POLICY "Admins manage team managers" ON public.team_managers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'hr', 'ceo')
        )
    );
