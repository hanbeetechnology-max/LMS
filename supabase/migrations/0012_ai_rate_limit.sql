-- Per-user hourly rate limiting for the AI Assistant Edge Function, which
-- calls a shared, free-tier external API key (Gemini) — unbounded use by
-- one student could exhaust the whole app's quota for everyone.
--
-- This table is only ever touched by the ai-assistant Edge Function using
-- the service-role key, which bypasses RLS entirely. No client (anon or
-- authenticated) ever needs to read or write it directly, so RLS is enabled
-- with NO policies at all — the principle of least access, matching how
-- this table is actually used.

create table ai_chat_usage (
  user_id uuid primary key references profiles(id) on delete cascade,
  request_count int not null default 0,
  window_started_at timestamptz not null default now()
);

alter table ai_chat_usage enable row level security;
