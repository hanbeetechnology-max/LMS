-- A per-minute burst limit, on top of the existing per-hour limit (0046).
-- Its own counter table keeps the hourly and minute windows independent.
-- The limit value itself is not in this migration: the Edge Function reads
-- GEMINI_PER_MINUTE_LIMIT from Supabase secrets, and skips the check when it's
-- unset.

create table ai_chat_minute_usage (
  user_id uuid primary key references profiles(id) on delete cascade,
  request_count int not null default 0,
  window_started_at timestamptz not null default now()
);

alter table ai_chat_minute_usage enable row level security;

create or replace function reserve_ai_user_minute_capacity(p_user uuid, p_limit int, p_window_seconds int default 60)
returns table (allowed boolean, request_count int, window_started_at timestamptz) as $$
declare
  v_count int;
  v_window timestamptz;
  v_rows int;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not allowed';
  end if;
  if p_user is null then raise exception 'p_user is required'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100000 then raise exception 'limit must be between 1 and 100000'; end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 3600 then raise exception 'window must be between 1 second and 1 hour'; end if;

  insert into ai_chat_minute_usage as u (user_id, request_count, window_started_at)
  values (p_user, 1, now())
  on conflict (user_id) do update
    set request_count = case
          when now() - u.window_started_at > make_interval(secs => p_window_seconds) then 1
          else u.request_count + 1
        end,
        window_started_at = case
          when now() - u.window_started_at > make_interval(secs => p_window_seconds) then now()
          else u.window_started_at
        end
    where (now() - u.window_started_at > make_interval(secs => p_window_seconds)) or u.request_count < p_limit
  returning u.request_count, u.window_started_at into v_count, v_window;

  get diagnostics v_rows = row_count;
  if v_rows = 1 then
    return query select true, v_count, v_window;
  else
    select existing.request_count, existing.window_started_at into v_count, v_window
    from ai_chat_minute_usage existing where existing.user_id = p_user;
    return query select false, coalesce(v_count, p_limit), coalesce(v_window, now());
  end if;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function reserve_ai_user_minute_capacity(uuid, int, int) from public, anon, authenticated;
grant execute on function reserve_ai_user_minute_capacity(uuid, int, int) to service_role;
