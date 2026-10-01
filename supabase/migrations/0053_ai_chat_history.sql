-- The AI Assistant is stateless: history is client-supplied per request and
-- never persisted, so a student loses their conversation on every page
-- reload. This adds a table scoped strictly to the owning user - no staff
-- or manager read policy at all, consistent with the privacy notice at
-- /privacy ("no broad behavioral tracking"). This is for a student to
-- resume their own conversation, not a surveillance log.

create table ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user', 'model')),
  content text not null check (char_length(content) <= 2000),
  created_at timestamptz not null default now()
);
create index on ai_chat_messages (user_id, created_at desc);

alter table ai_chat_messages enable row level security;

-- Read-only for the owning user. Writes only happen via the Edge Function's
-- service-role key, which bypasses RLS entirely - there is deliberately no
-- insert policy here, matching the ai_chat_usage table's existing pattern.
create policy "a user reads only their own AI chat history"
  on ai_chat_messages for select
  using (user_id = auth.uid());

-- A student can clear their own history (e.g. "start a new conversation").
create policy "a user deletes only their own AI chat history"
  on ai_chat_messages for delete
  using (user_id = auth.uid());
