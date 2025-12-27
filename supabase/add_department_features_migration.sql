-- Create department_activities table
CREATE TABLE IF NOT EXISTS public.department_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.department_activities ENABLE ROW LEVEL SECURITY;

-- Policies for department_activities

-- 1. View: Members of the team, Managers of the team, Admins/HR/CEO
CREATE POLICY "Team members and admins view activities" ON public.department_activities
    FOR SELECT
    USING (
        -- User is in the team
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND team_id = public.department_activities.team_id))
        OR
        -- User is manager of the team
        (EXISTS (SELECT 1 FROM public.team_managers WHERE manager_id = auth.uid() AND team_id = public.department_activities.team_id))
        OR
        -- User is Admin/HR/CEO
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'hr', 'ceo') AND company_id = public.department_activities.company_id))
    );

-- 2. Insert/Update/Delete: Managers of the team, Admins
CREATE POLICY "Managers and admins manage activities" ON public.department_activities
    FOR ALL
    USING (
        -- User is manager of the team
        (EXISTS (SELECT 1 FROM public.team_managers WHERE manager_id = auth.uid() AND team_id = public.department_activities.team_id))
        OR
        -- User is Admin/HR/CEO
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'hr', 'ceo') AND company_id = public.department_activities.company_id))
    );


-- Create department_reports table
CREATE TABLE IF NOT EXISTS public.department_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT CHECK (status IN ('draft', 'submitted')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.department_reports ENABLE ROW LEVEL SECURITY;

-- Policies for department_reports

-- 1. View: Author (Manager), Admins
CREATE POLICY "Managers view own reports, Admins view all" ON public.department_reports
    FOR SELECT
    USING (
        -- Author
        author_id = auth.uid()
        OR
        -- Admin/HR/CEO
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'hr', 'ceo') AND company_id = public.department_reports.company_id))
    );

-- 2. Insert/Update: Managers of the team, Admins
CREATE POLICY "Managers manage reports" ON public.department_reports
    FOR ALL
    USING (
        -- Manager of the team
        (EXISTS (SELECT 1 FROM public.team_managers WHERE manager_id = auth.uid() AND team_id = public.department_reports.team_id))
        OR
        -- Admin/HR/CEO
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'hr', 'ceo') AND company_id = public.department_reports.company_id))
    );
