-- Migration: Fix Chat RLS Infinite Recursion
-- Description: Creates a helper function to check participation without triggering recursive RLS policies.

-- 1. Create a secure helper function to check participation
-- This function accesses chat_participants directly with SECURITY DEFINER privileges,
-- bypassing the RLS on chat_participants that causes the recursion.
CREATE OR REPLACE FUNCTION public.is_chat_participant(p_channel_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.chat_participants 
        WHERE channel_id = p_channel_id 
        AND user_id = auth.uid()
    );
END;
$$;

-- 2. Update chat_channels policy to use the helper function
DROP POLICY IF EXISTS "Strict Channel Isolation" ON public.chat_channels;
DROP POLICY IF EXISTS "Channels visible if user is participant" ON public.chat_channels;

CREATE POLICY "Strict Channel Isolation"
    ON public.chat_channels
    FOR SELECT
    USING (
        -- 1. Company check (Basic isolation)
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND
        (
            -- 2. Participation check (Broken recursion via function)
            public.is_chat_participant(id)
            OR
            -- 3. Department check (Team overlap)
            (
                type = 'department' AND EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.team_id = public.chat_channels.team_id
                )
            )
            OR
            -- 4. Admin Support / Public channels if any (Optional, based on requirement)
            type = 'admin_support'
        )
    );

-- 3. Update chat_participants to be simple
-- You can see a participant row if:
--   a) It's YOU
--   b) OR you are a participant in that channel (which we can now check safely via the FUNCTION or just trusting the channel policy if we didn't recurse)
-- But simply: recursion happens if chat_participants checks chat_channels which checks chat_participants.
-- We broke the loop in chat_channels. So chat_channels is now "safe".
-- STRICTLY: We can update chat_participants to rely on the *now safe* chat_channels policy?
-- NO. chat_channels policy calls `is_chat_participant` which reads `chat_participants`.
-- If `chat_participants` policy reads `chat_channels`, we are accessing `chat_channels`. 
-- Does `chat_channels` access `chat_participants`? Yes, via the function.
-- Does the function trigger RLS? NO. SECURITY DEFINER bypasses RLS on the table it reads?
-- YES. SECURITY DEFINER functions bypass RLS for the tables they access within the function body.
-- So `is_chat_participant` reads `chat_participants` WITHOUT triggering `chat_participants` RLS.
-- Therefore, `chat_participants` RLS *can* safely reference `chat_channels`.

DROP POLICY IF EXISTS "View participants if channel is visible" ON public.chat_participants;
CREATE POLICY "View participants if channel is visible"
    ON public.chat_participants
    FOR SELECT
    USING (
         -- Can see if you are in the channel or it's your team's channel
         -- Actually, just "If I can see the channel, I can see its participants" is the standard rule.
         EXISTS (
            SELECT 1 FROM public.chat_channels cc
            WHERE cc.id = channel_id
         )
    );
