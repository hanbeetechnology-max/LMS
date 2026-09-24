-- Fixes a real, pre-existing bug in 0002_rls.sql's conversation_participants
-- SELECT policy, found while verifying messagingApi.ts against the live
-- pooler: the policy's own USING clause selects from
-- conversation_participants to check membership, which re-triggers the same
-- policy on the subquery, which selects from conversation_participants
-- again, and so on — Postgres reports this immediately as "infinite
-- recursion detected in policy for relation conversation_participants"
-- (confirmed live: `select ... from conversation_participants` as any
-- authenticated user errors with code 42P17, which also broke sending a
-- message, since the messages INSERT policy's own `exists (select ... from
-- conversation_participants ...)` check hits the same recursive policy).
--
-- Fix: same technique 0002_rls.sql already uses for profiles/my_role() —
-- a SECURITY DEFINER helper function reads conversation_participants
-- without going back through its RLS policy, breaking the recursion. Not
-- edited in place per this round's instructions (0001/0002 stay untouched);
-- this migration drops and replaces just the one broken policy.

create function is_participant_of(conv_id uuid) returns boolean as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv_id and user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

drop policy "a participant sees the participant list of their conversations" on conversation_participants;

create policy "a participant sees the participant list of their conversations"
  on conversation_participants for select
  using (is_participant_of(conversation_id));
