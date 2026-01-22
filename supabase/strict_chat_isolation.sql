-- Migration: Strict Chat Isolation via company_id
-- Description: Adds company_id to chat_channels, backfills it, and enforces strict RLS.

-- 1. Add company_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_channels' AND column_name = 'company_id') THEN
        ALTER TABLE public.chat_channels ADD COLUMN company_id UUID REFERENCES public.companies(id);
    END IF;
END $$;

-- 2. Backfill company_id
-- Logic: 
--   - For DMs: Use participant_a's company.
--   - For Department: Use team's company.
--   - For others: Try to infer from participants.

-- Backfill DMs where company_id is null
UPDATE public.chat_channels cc
SET company_id = (
    SELECT company_id FROM public.profiles p WHERE p.id = cc.participant_a
)
WHERE type = 'dm' AND company_id IS NULL;

-- Backfill Department channels
UPDATE public.chat_channels cc
SET company_id = (
    SELECT company_id FROM public.teams t WHERE t.id = cc.team_id
)
WHERE type = 'department' AND company_id IS NULL;

-- 3. Delete cross-company DMs (Security Cleanup)
-- Delete DMs where participants are in different companies
DELETE FROM public.chat_channels cc
WHERE type = 'dm'
AND EXISTS (
    SELECT 1 
    FROM public.profiles p1, public.profiles p2
    WHERE p1.id = cc.participant_a
    AND p2.id = cc.participant_b
    AND p1.company_id != p2.company_id
);

-- 4. Update RLS on chat_channels to STRICTLY enforce company_id
DROP POLICY IF EXISTS "Channels visible if user is participant" ON public.chat_channels;
CREATE POLICY "Strict Channel Isolation"
    ON public.chat_channels
    FOR SELECT
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND
        (
            -- Still need to be a participant or valid role
            EXISTS (
                SELECT 1 FROM public.chat_participants cp
                WHERE cp.channel_id = id
                AND cp.user_id = auth.uid()
            )
            OR
            -- Or department logic
            (type = 'department' AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                AND p.team_id = public.chat_channels.team_id
            ))
        )
    );

-- 5. Enforce company_id on INSERT
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.chat_channels;
CREATE POLICY "Strict Channel Creation"
    ON public.chat_channels
    FOR INSERT
    WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

-- 6. Helper: Function to auto-set company_id on insert if null? 
-- Better to force client to send it OR trigger. 
-- Let's use a trigger to ensure it's always set to creator's company to be safe.

CREATE OR REPLACE FUNCTION public.set_channel_company_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.company_id IS NULL THEN
        SELECT company_id INTO NEW.company_id FROM public.profiles WHERE id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_channel_company_id ON public.chat_channels;
CREATE TRIGGER ensure_channel_company_id
    BEFORE INSERT ON public.chat_channels
    FOR EACH ROW
    EXECUTE FUNCTION public.set_channel_company_id();
