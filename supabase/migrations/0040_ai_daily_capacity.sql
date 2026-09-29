-- Shared daily cap for the Gemini key used by the AI Assistant Edge Function.
-- The service-role function reserves capacity atomically, so parallel requests
-- cannot spend more than the configured project-wide daily allowance.

create table ai_daily_capacity (
  usage_date date primary key,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table ai_daily_capacity enable row level security;
revoke all on ai_daily_capacity from public, anon, authenticated;

create or replace function reserve_ai_daily_capacity(p_daily_limit integer)
returns table (allowed boolean, request_count integer, usage_date date) as $$
declare
  v_date date := (now() at time zone 'UTC')::date;
  v_count integer;
  v_rows integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not allowed';
  end if;
  if p_daily_limit is null or p_daily_limit < 1 or p_daily_limit > 100000 then
    raise exception 'daily limit must be between 1 and 100000';
  end if;

  delete from ai_daily_capacity where ai_daily_capacity.usage_date < v_date - 30;

  insert into ai_daily_capacity as current_usage (usage_date, request_count, updated_at)
  values (v_date, 1, now())
  on conflict (usage_date) do update
    set request_count = current_usage.request_count + 1,
        updated_at = now()
    where current_usage.request_count < p_daily_limit
  returning current_usage.request_count into v_count;

  get diagnostics v_rows = row_count;
  if v_rows = 1 then
    return query select true, v_count, v_date;
  else
    select current_usage.request_count into v_count
    from ai_daily_capacity as current_usage
    where current_usage.usage_date = v_date;
    return query select false, coalesce(v_count, p_daily_limit), v_date;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function reserve_ai_daily_capacity(integer) from public, anon, authenticated;
grant execute on function reserve_ai_daily_capacity(integer) to service_role;
