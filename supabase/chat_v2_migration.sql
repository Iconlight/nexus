-- Add DM support to chat_channels
ALTER TABLE public.chat_channels 
DROP CONSTRAINT IF EXISTS chat_channels_type_check;

ALTER TABLE public.chat_channels 
ADD CONSTRAINT chat_channels_type_check 
CHECK (type IN ('department', 'admin_support', 'dm'));

-- Add participant columns for 1:1 DMs
ALTER TABLE public.chat_channels 
ADD COLUMN IF NOT EXISTS participant_a UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS participant_b UUID REFERENCES public.profiles(id);

-- Prevent self-messaging
ALTER TABLE public.chat_channels
DROP CONSTRAINT IF EXISTS chat_channels_no_self_dm;

ALTER TABLE public.chat_channels
ADD CONSTRAINT chat_channels_no_self_dm
CHECK (participant_a != participant_b);

-- Ensure we don't have duplicate DM rooms between same people
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_dm_participants 
ON public.chat_channels (LEAST(participant_a, participant_b), GREATEST(participant_a, participant_b)) 
WHERE type = 'dm';

-- Update RLS for Channels
DROP POLICY IF EXISTS "DM channels visible to participants" ON public.chat_channels;
CREATE POLICY "DM channels visible to participants"
    ON public.chat_channels
    FOR SELECT
    USING (
        type = 'dm' 
        AND (participant_a = auth.uid() OR participant_b = auth.uid())
    );

-- Update RLS for Messages (to include DM checks)
DROP POLICY IF EXISTS "Messages visible if channel is visible" ON public.chat_messages;
CREATE POLICY "Messages visible if channel is visible"
    ON public.chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_channels
            WHERE id = chat_messages.channel_id
            AND (
                -- Case 1: Department Channel
                (
                    type = 'department' 
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
                OR
                -- Case 3: DM Channel
                (
                    type = 'dm'
                    AND (participant_a = auth.uid() OR participant_b = auth.uid())
                )
            )
        )
    );

-- Users can INSERT messages if they can VIEW the channel
DROP POLICY IF EXISTS "Users can send messages to visible channels" ON public.chat_messages;
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
                OR
                -- Case 3: DM Channel
                (
                    type = 'dm'
                    AND (participant_a = auth.uid() OR participant_b = auth.uid())
                )
            )
        )
    );

-- Allow users to CREATE channels
DROP POLICY IF EXISTS "Authorized users can create channels" ON public.chat_channels;
CREATE POLICY "Authorized users can create channels"
    ON public.chat_channels
    FOR INSERT
    WITH CHECK (
        -- Admins, CEO, HR can create any channel
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'ceo', 'hr')
        )
        OR
        -- Managers can create DM channels where they are a participant
        (
            type = 'dm'
            AND (participant_a = auth.uid() OR participant_b = auth.uid())
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'manager'
            )
        )
    );
