-- Add is_read column to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Update existing messages to be read (optional, but good for cleanliness)
UPDATE public.chat_messages SET is_read = TRUE WHERE created_at < NOW();
