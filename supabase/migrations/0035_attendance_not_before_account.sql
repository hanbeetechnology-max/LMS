-- Days before a staff member's account existed are not absences. Found on the
-- attendance screen: an account created on 16 Sept showed 17 absent days for
-- 1 to 15 Sept, which would also inflate the manager's absent counts.

create or replace function staff_attendance(p_staff uuid default null, p_from date default null, p_to date default null)
returns table (
  work_date date, status text, clock_in timestamptz, clock_out timestamptz,
  hours numeric, on_time boolean, holiday_name text
) as $$
declare
  v_staff uuid := coalesce(p_staff, auth.uid());
  v_from date := coalesce(p_from, current_date - 29);
  v_to date := coalesce(p_to, current_date);
  s staff_work_settings;
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'not allowed'; end if;
  if v_staff <> auth.uid() and not is_manager() then raise exception 'not allowed'; end if;
  if v_to < v_from or v_to - v_from > 366 then raise exception 'invalid range'; end if;
  select * into s from staff_work_settings limit 1;
  return query
  select d::date,
    case
      -- Working on a holiday or a day off is never late, whatever the clock-in time.
      when t.id is not null then case
        when t.on_time or h.id is not null or not (extract(isodow from d)::int = any (s.work_days)) then 'present'
        else 'late' end
      when h.id is not null then 'holiday'
      when not (extract(isodow from d)::int = any (s.work_days)) then 'off'
      -- Days before this account existed are not absences.
      when d::date < sp.created_at::date then 'off'
      when d::date > current_date then 'upcoming'
      when d::date = current_date then 'today'
      else 'absent'
    end,
    t.clock_in, t.clock_out,
    case when t.clock_in is not null
         then round((extract(epoch from (coalesce(t.clock_out, now()) - t.clock_in)) / 3600.0)::numeric, 1) end,
    t.on_time, h.name
  from generate_series(v_from::timestamp, v_to::timestamp, interval '1 day') d
  cross join (select created_at from profiles where id = v_staff) sp
  left join staff_time_entries t on t.staff_id = v_staff and t.work_date = d::date
  left join holidays h on h.holiday_date = d::date and h.scope in ('staff', 'center')
  order by d desc;
end;
$$ language plpgsql stable security definer set search_path = public;
