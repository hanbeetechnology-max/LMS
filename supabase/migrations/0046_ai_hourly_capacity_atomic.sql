-- The AI Assistant Edge Function's per-user hourly rate limit was a
-- read-then-write: select the current count, compute the next value in
-- JavaScript, then upsert/update it in a second round-trip. That's a real
-- TOCTOU race under concurrent requests - two requests from the same user
-- arriving close together can both read request_count=19, both compute
-- nextCount=20, both pass the "> 20" check, and both proceed, letting a
-- user exceed their hourly limit under load. The shared daily cap
-- (reserve_ai_daily_capacity, migration 0040) already does this correctly
-- with a single atomic statement; this gives the per-user limit the same
-- treatment.

create or replace function reserve_ai_user_hourly_capacity(p_user uuid, p_limit int, p_window_seconds int default 3600)
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
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then raise exception 'window must be between 1 second and 1 day'; end if;

  -- One statement: start a fresh window (count 1) if the previous window has
  -- expired, otherwise increment only while still under the limit. Either
  -- way this commits atomically, so two concurrent requests can't both read
  -- the same pre-increment count and both pass the check.
  insert into ai_chat_usage as u (user_id, request_count, window_started_at)
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
    -- Qualified with an alias: request_count/window_started_at are also
    -- this function's own OUT parameter names, which PL/pgSQL would
    -- otherwise treat as ambiguous against the bare table columns.
    select existing.request_count, existing.window_started_at into v_count, v_window
    from ai_chat_usage existing where existing.user_id = p_user;
    return query select false, coalesce(v_count, p_limit), coalesce(v_window, now());
  end if;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function reserve_ai_user_hourly_capacity(uuid, int, int) from public, anon, authenticated;
grant execute on function reserve_ai_user_hourly_capacity(uuid, int, int) to service_role;
