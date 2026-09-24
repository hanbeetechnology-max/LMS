-- Real backing for the messaging round (messagingApi.ts): `conversations` and
-- `conversation_participants` (0001_init.sql) have SELECT-only RLS policies
-- (0002_rls.sql) — a signed-in user can read a conversation they're already
-- in, but there is no INSERT policy on either table, so nothing can ever
-- create one. Rather than opening a broad "any signed-in user can insert
-- conversation_participants" policy (which would let a user add themselves
-- to *any* conversation, not just ones they're starting), this adds a single
-- SECURITY DEFINER RPC that finds-or-creates a 1:1 conversation between the
-- caller and one other user. It only ever inserts a conversation containing
-- (auth.uid(), target) — a narrow, deliberate surface — and uses
-- pg_advisory_xact_lock keyed on the sorted pair to make concurrent calls
-- for the same pair safe (no duplicate conversations from a race).

create or replace function start_conversation_with(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv_id uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if other_user_id = me then
    raise exception 'cannot start a conversation with yourself';
  end if;
  if not exists (select 1 from profiles where id = other_user_id) then
    raise exception 'unknown user';
  end if;

  -- Serialize concurrent calls for this same pair (held for the transaction).
  perform pg_advisory_xact_lock(
    hashtextextended(
      (select string_agg(id::text, '|' order by id) from unnest(array[me, other_user_id]) as id),
      0
    )
  );

  select cp1.conversation_id into conv_id
  from conversation_participants cp1
  join conversation_participants cp2
    on cp2.conversation_id = cp1.conversation_id and cp2.user_id = other_user_id
  where cp1.user_id = me
  limit 1;

  if conv_id is null then
    insert into conversations default values returning id into conv_id;
    insert into conversation_participants (conversation_id, user_id)
    values (conv_id, me), (conv_id, other_user_id);
  end if;

  return conv_id;
end;
$$;

grant execute on function start_conversation_with(uuid) to authenticated;
