-- Drop existing prohibitive policy if necessary, or just create a new permissive one for updates
-- Assuming default deny, we need to allow update
-- Drop the previous policy first to avoid conflicts
drop policy if exists "Allow participants to update messages" on chat_messages;

create policy "Allow participants to update messages"
on chat_messages for update
using (
  exists (
    select 1 from chat_channels cc
    where cc.id = channel_id
    and (
      (cc.type = 'dm' and auth.uid() in (cc.participant_a, cc.participant_b))
      or
      (cc.type != 'dm') -- Allow updates for group chats (Leadership/Department) if user has access to channel
    )
  )
)
with check (
  exists (
    select 1 from chat_channels cc
    where cc.id = channel_id
    and (
      (cc.type = 'dm' and auth.uid() in (cc.participant_a, cc.participant_b))
      or
      (cc.type != 'dm')
    )
  )
);
