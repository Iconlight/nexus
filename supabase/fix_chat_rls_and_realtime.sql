-- Migration: Fix chat RLS and enable Realtime
-- Description: Simplifies chat RLS, enables Realtime for messages, and fixes profile visibility.

-- 1. Enable Realtime for chat_messages
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.chat_messages;
COMMIT;

-- 2. Improve Profiles RLS (Avoid circularity)
DROP POLICY IF EXISTS "View profiles in same company" ON public.profiles;
CREATE POLICY "View profiles in same company" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (
            id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles p2 
                WHERE p2.id = auth.uid() 
                AND p2.company_id = public.profiles.company_id
            )
        )
    );

-- 3. Simplify Chat Messages RLS
DROP POLICY IF EXISTS "Messages visible if channel is visible" ON public.chat_messages;
CREATE POLICY "Messages visible if channel is visible"
    ON public.chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_channels cc
            WHERE cc.id = public.chat_messages.channel_id
            AND (
                -- DM: Participant a or b
                (cc.type = 'dm' AND (cc.participant_a = auth.uid() OR cc.participant_b = auth.uid()))
                OR
                -- Department: User is in the team
                (cc.type = 'department' AND EXISTS (
                    SELECT 1 FROM public.profiles p 
                    WHERE p.id = auth.uid() AND p.team_id = cc.team_id
                ))
                OR
                -- Admin Support: Leadership roles
                (cc.type = 'admin_support' AND EXISTS (
                    SELECT 1 FROM public.profiles p 
                    WHERE p.id = auth.uid() AND p.role IN ('manager', 'admin', 'hr', 'ceo')
                ))
            )
        )
    );

-- Also allow viewing messages if the user is explicitly a participant (covers all types)
DROP POLICY IF EXISTS "Messages visible if user is participant" ON public.chat_messages;
CREATE POLICY "Messages visible if user is participant"
    ON public.chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.channel_id = public.chat_messages.channel_id
            AND cp.user_id = auth.uid()
        )
    );

-- 4. Chat Channels RLS Update
-- Ensure users can see channels they are participants in
DROP POLICY IF EXISTS "Channels visible if user is participant" ON public.chat_channels;
CREATE POLICY "Channels visible if user is participant"
    ON public.chat_channels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.channel_id = public.chat_channels.id
            AND cp.user_id = auth.uid()
        )
    );
