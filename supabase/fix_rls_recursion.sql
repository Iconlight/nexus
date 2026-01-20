-- Migration: Break RLS Recursion
-- Description: Uses SECURITY DEFINER functions to allow policies to check membership without triggering recursive RLS checks.

-- 1. Helper Function: Is Member? (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_chat_member(channel_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres), bypassing RLS
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.chat_participants cp
        WHERE cp.channel_id = is_chat_member.channel_id
        AND cp.user_id = is_chat_member.user_id
    );
END;
$$;

-- 2. Helper Function: Is Team Member? (Bypasses RLS)
-- Helpful to safely check department access without triggering potential profile/team loops
CREATE OR REPLACE FUNCTION public.is_team_member(t_id UUID, u_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = u_id
        AND p.team_id = t_id
    );
END;
$$;


-- 3. Update CHAT_CHANNELS Policy
DROP POLICY IF EXISTS "Channels visible if user is participant" ON public.chat_channels;
CREATE POLICY "Channels visible if user is participant"
    ON public.chat_channels
    FOR SELECT
    USING (
        -- 1. Direct Participation (DM / Private) - via Secure Func
        (
            type IN ('dm', 'admin_support') 
            AND public.is_chat_member(id, auth.uid())
        )
        OR
        -- 2. Department Access - via Secure Func
        (
            type = 'department' 
            AND public.is_team_member(team_id, auth.uid())
        )
    );

-- 4. Update CHAT_PARTICIPANTS Policy
-- Now we can safely check if the channel is visible, because accessing chat_channels
-- will trigger the policy above, which NO LONGER queries chat_participants directly (it uses the function).
-- Loop Broken: 
-- chat_participants(select) -> checks chat_channels(select) -> checks is_chat_member(func) -> reads chat_participants(raw).
DROP POLICY IF EXISTS "View participants if channel is visible" ON public.chat_participants;
CREATE POLICY "View participants if channel is visible"
    ON public.chat_participants
    FOR SELECT
    USING (
         EXISTS (
            SELECT 1 FROM public.chat_channels cc
            WHERE cc.id = channel_id
         )
    );

-- 5. Update CHAT_MESSAGES Policy (Just to be safe/consistent)
DROP POLICY IF EXISTS "Strict message visibility" ON public.chat_messages;
CREATE POLICY "Strict message visibility"
    ON public.chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_channels cc
            WHERE cc.id = channel_id
        )
    );
