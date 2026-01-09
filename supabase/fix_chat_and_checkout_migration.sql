-- Migration: Fix chat channel sorting and implement auto-checkout
-- Description: Adds updated_at to chat_channels, adds a trigger to update it on new messages, 
--              and adds a function/trigger for auto-checkout at 12am.

-- 1. FIX CHAT CHANNELS
-- Add updated_at if it doesn't exist
ALTER TABLE public.chat_channels 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Function to update the channel timestamp
CREATE OR REPLACE FUNCTION public.handle_message_sent()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_channels
    SET updated_at = timezone('utc'::text, now())
    WHERE id = NEW.channel_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on chat_messages
DROP TRIGGER IF EXISTS on_chat_message_sent ON public.chat_messages;
CREATE TRIGGER on_chat_message_sent
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_message_sent();


-- 2. AUTO-CHECKOUT LOGIC
-- Function to close hanging check-ins from previous days
CREATE OR REPLACE FUNCTION public.close_previous_day_checkins(p_employee_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update any attendance logs for this employee that are from a previous date and have no check_out_time
    UPDATE public.attendance_logs
    SET check_out_time = (date + time '23:59:59')::timestamp with time zone
    WHERE employee_id = p_employee_id
    AND date < CURRENT_DATE
    AND check_out_time IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to be used in trigger
CREATE OR REPLACE FUNCTION public.on_checkin_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    -- Cleanup previous days for THIS employee before inserting new log
    PERFORM public.close_previous_day_checkins(NEW.employee_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to cleanup BEFORE NEW check-in
DROP TRIGGER IF EXISTS cleanup_before_checkin ON public.attendance_logs;
CREATE TRIGGER cleanup_before_checkin
    BEFORE INSERT ON public.attendance_logs
    FOR EACH ROW EXECUTE FUNCTION public.on_checkin_cleanup();

-- Optional: Cleanup for all employees (can be called by a cron if available, 
-- but we'll also call it from the app for the specific user)
CREATE OR REPLACE FUNCTION public.cleanup_all_hanging_checkins()
RETURNS VOID AS $$
BEGIN
    UPDATE public.attendance_logs
    SET check_out_time = (date + time '23:59:59')::timestamp with time zone
    WHERE date < CURRENT_DATE
    AND check_out_time IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. MISSING CHAT INFRASTRUCTURE
-- Create chat_participants table
CREATE TABLE IF NOT EXISTS public.chat_participants (
    channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (channel_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_participants
DROP POLICY IF EXISTS "Participants can view their own membership" ON public.chat_participants;
CREATE POLICY "Participants can view their own membership"
    ON public.chat_participants
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Participants can update their own last_read_at" ON public.chat_participants;
CREATE POLICY "Participants can update their own last_read_at"
    ON public.chat_participants
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RPC to join a channel
CREATE OR REPLACE FUNCTION public.join_chat_channel(p_channel_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.chat_participants (channel_id, user_id, joined_at, last_read_at)
    VALUES (p_channel_id, auth.uid(), now(), now())
    ON CONFLICT (channel_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
