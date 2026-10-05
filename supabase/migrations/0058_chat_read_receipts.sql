-- Read receipts (the double ticks) need to know when the OTHER members last
-- read the conversation. conversation_participants has that data, but the
-- client can't read other people's rows, so this exposes exactly that one
-- thing: the read times of the other participants of a conversation the
-- caller is in. Message bodies and membership details stay private.

create or replace function chat_read_receipts(p_conversation_id uuid)
returns table (user_id uuid, last_read_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select cp.user_id, cp.last_read_at
  from conversation_participants cp
  where cp.conversation_id = p_conversation_id
    and cp.user_id <> auth.uid()
    and is_participant_of(p_conversation_id);
$$;

revoke all on function chat_read_receipts(uuid) from public, anon;
grant execute on function chat_read_receipts(uuid) to authenticated;
