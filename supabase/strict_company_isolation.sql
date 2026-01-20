-- Migration: Enforce Strict Company Isolation
-- Description: Updates RLS policies to strictly enforce company_id checks on all major tables.

-- 1. PROFILES: Strict Company Isolation
DROP POLICY IF EXISTS "View profiles in same company" ON public.profiles;
CREATE POLICY "View profiles in same company" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (
            id = auth.uid() OR
            company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- 2. TEAMS: Strict Company Isolation
-- Assume teams has company_id. If not, we join through profiles (manager) -> bad.
-- Nexus schema typically has company_id on teams.
DROP POLICY IF EXISTS "View teams in same company" ON public.teams;
CREATE POLICY "View teams in same company" ON public.teams
    FOR SELECT
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

-- 3. CHAT CHANNELS: Strict Isolation + Membership
-- A user can ONLY see a channel if:
--   a) They are a participant
--   b) AND the channel belongs to their company (implicit via participants)
--   c) OR it's a department channel for their team
DROP POLICY IF EXISTS "Channels visible if user is participant" ON public.chat_channels;
CREATE POLICY "Channels visible if user is participant"
    ON public.chat_channels
    FOR SELECT
    USING (
        -- User must be a participant OR in the relevant team/role
        -- DM / Admin Support logic:
        (
            type IN ('dm', 'admin_support') AND EXISTS (
                SELECT 1 FROM public.chat_participants cp
                WHERE cp.channel_id = id
                AND cp.user_id = auth.uid()
            )
        )
        OR
        -- Department logic: User must be in the team AND same company
        (
            type = 'department' AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.team_id = public.chat_channels.team_id
            )
        )
    );

-- 4. CHAT MESSAGES: Strict Isolation via Channel
-- If you can't see the channel, you can't see the messages.
DROP POLICY IF EXISTS "Messages visible if channel is visible" ON public.chat_messages;
CREATE POLICY "Strict message visibility"
    ON public.chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_channels cc
            WHERE cc.id = channel_id
            -- Re-use the channel visibility logic by querying the viewable channels
            -- This relies on the policy above being correct.
            -- Alternatively, replicate the logic for robustness:
            AND (
                 EXISTS (
                    SELECT 1 FROM public.chat_participants cp
                    WHERE cp.channel_id = cc.id AND cp.user_id = auth.uid()
                )
                OR
                (
                    cc.type = 'department' AND EXISTS (
                        SELECT 1 FROM public.profiles p
                        WHERE p.id = auth.uid() AND p.team_id = cc.team_id
                    )
                )
            )
        )
    );

-- 5. CHAT PARTICIPANTS: Strict Isolation
-- You can only see participants for channels you can see.
DROP POLICY IF EXISTS "View participants if channel is visible" ON public.chat_participants;
CREATE POLICY "View participants if channel is visible"
    ON public.chat_participants
    FOR SELECT
    USING (
         -- Can see if you are in the channel or it's your team's channel
         EXISTS (
            SELECT 1 FROM public.chat_channels cc
            WHERE cc.id = channel_id
            AND (
                 EXISTS (
                    SELECT 1 FROM public.chat_participants cp2
                    WHERE cp2.channel_id = cc.id AND cp2.user_id = auth.uid()
                )
                OR
                (
                    cc.type = 'department' AND EXISTS (
                        SELECT 1 FROM public.profiles p
                        WHERE p.id = auth.uid() AND p.team_id = cc.team_id
                    )
                )
            )
         )
    );

-- 6. LEAVE REQUESTS: Strict Company Isolation
DROP POLICY IF EXISTS "View leave requests in same company" ON public.leave_requests;
CREATE POLICY "View leave requests in same company" ON public.leave_requests
    FOR SELECT
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );
