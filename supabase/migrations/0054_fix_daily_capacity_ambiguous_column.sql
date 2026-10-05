-- reserve_ai_daily_capacity (0040) has been failing on every call in production
-- with "column reference usage_date is ambiguous": its RETURNS TABLE column
-- usage_date collides with the ai_daily_capacity column used in the
-- ON CONFLICT (usage_date) target. Same root cause as 0046's ambiguous
-- column fix. The #variable_conflict directive tells PL/pgSQL to resolve bare
-- names to table columns, so the output column name and return shape stay
-- unchanged for callers.

create or replace function reserve_ai_daily_capacity(p_daily_limit integer)
returns table(allowed boolean, request_count integer, usage_date date)
language plpgsql
security definer
set search_path to 'public'
as $function$
#variable_conflict use_column
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
$function$;
