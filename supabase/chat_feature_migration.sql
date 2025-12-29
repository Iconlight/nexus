-- Create chat_channels table
CREATE TABLE IF NOT EXISTS public.chat_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('department', 'admin_support')),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, type) -- One department channel per team
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON public.chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- RLS Policies for Channels

-- 1. Department Channels: Visible ONLY to members of the team (Employees/Managers).
-- explicitly excluding 'admin' role if they happen to be in the team (unless they are the manager?).
-- User requirement: "admins are not able to see the chats within departments".
-- Logic: User must be in the team AND (role is employee OR role is manager).
CREATE POLICY "Department channels visible to team members"
    ON public.chat_channels
    FOR SELECT
    USING (
        type = 'department' 
        AND team_id IS NOT NULL 
        AND EXISTS (
             SELECT 1 FROM public.profiles
             WHERE profiles.id = auth.uid()
             AND profiles.team_id = chat_channels.team_id
             AND profiles.role IN ('employee', 'manager')
        )
    );

-- 2. Admin Support Channel: Visible to Managers and Admins/HR/CEO.
CREATE POLICY "Admin support channel visible to leadership"
    ON public.chat_channels
    FOR SELECT
    USING (
        type = 'admin_support'
        AND EXISTS (
             SELECT 1 FROM public.profiles
             WHERE profiles.id = auth.uid()
             AND profiles.role IN ('manager', 'admin', 'hr', 'ceo')
        )
    );

-- RLS Policies for Messages

-- Users can VIEW messages if they can VIEW the channel.
CREATE POLICY "Messages visible if channel is visible"
    ON public.chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_channels
            WHERE id = chat_messages.channel_id
            AND (
                -- Re-implementing logic here for performance/clarity or using View trick?
                -- Supabase recursing policies can be slow. Let's duplicate the logic slightly for speed.
                
                -- Case 1: Department Channel
                (
                    type = 'department' 
                    AND team_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.profiles
                        WHERE profiles.id = auth.uid()
                        AND profiles.team_id = chat_channels.team_id
                        AND profiles.role IN ('employee', 'manager')
                    )
                )
                OR
                -- Case 2: Admin Support Channel
                (
                    type = 'admin_support'
                    AND EXISTS (
                        SELECT 1 FROM public.profiles
                        WHERE profiles.id = auth.uid()
                        AND profiles.role IN ('manager', 'admin', 'hr', 'ceo')
                    )
                )
            )
        )
    );

-- Users can INSERT messages if they can VIEW the channel.
CREATE POLICY "Users can send messages to visible channels"
    ON public.chat_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_channels
            WHERE id = channel_id
            AND (
                -- Case 1: Department Channel
                (
                    type = 'department' 
                    AND team_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.profiles
                        WHERE profiles.id = auth.uid()
                        AND profiles.team_id = chat_channels.team_id
                        AND profiles.role IN ('employee', 'manager')
                    )
                )
                OR
                -- Case 2: Admin Support Channel
                (
                    type = 'admin_support'
                    AND EXISTS (
                        SELECT 1 FROM public.profiles
                        WHERE profiles.id = auth.uid()
                        AND profiles.role IN ('manager', 'admin', 'hr', 'ceo')
                    )
                )
            )
        )
    );

-- SEED DATA
-- 1. Create 'Leadership Chat' if not exists
INSERT INTO public.chat_channels (name, type)
SELECT 'Leadership Chat', 'admin_support'
WHERE NOT EXISTS (SELECT 1 FROM public.chat_channels WHERE type = 'admin_support');

-- 2. Create Department Channels for existing teams
INSERT INTO public.chat_channels (name, type, team_id)
SELECT name, 'department', id
FROM public.teams
WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_channels 
    WHERE team_id = teams.id AND type = 'department'
);
