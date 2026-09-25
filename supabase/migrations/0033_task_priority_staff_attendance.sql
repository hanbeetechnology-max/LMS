-- Task priority and status (replaces pinning), and Hanbee staff attendance for
-- the manager's performance view.
--
-- Tasks: each task gets a priority (low, medium, high) and a status (todo,
-- in progress, done) for the board view. `done` stays and is kept in sync so
-- existing code keeps working.
--
-- Attendance: a Hanbee staff member clocks in and out (staff_time_entries,
-- times set by the server since 0017). What counts as late is decided by
-- staff_work_settings (start time, grace minutes, time zone, working days),
-- which only the manager can change. Holidays (scope staff or center) and
-- days off are not counted as absent.

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create type task_priority as enum ('low', 'medium', 'high');
create type task_status as enum ('todo', 'in_progress', 'done');

alter table staff_tasks
  add column priority task_priority not null default 'medium',
  add column status task_status not null default 'todo',
  add column description text not null default '',
  add column created_at timestamptz not null default now();

update staff_tasks set status = 'done' where done;

create or replace function sync_task_status() returns trigger as $$
begin
  if tg_op = 'UPDATE' and new.done is distinct from old.done and new.status is not distinct from old.status then
    new.status := case when new.done then 'done'::task_status else 'todo'::task_status end;
  end if;
  new.done := (new.status = 'done');
  if tg_op = 'UPDATE' then
    new.staff_id := old.staff_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$ language plpgsql security invoker set search_path = public;

create trigger trg_sync_task_status
  before insert or update on staff_tasks
  for each row execute function sync_task_status();

-- ---------------------------------------------------------------------------
-- Working hours (one row)
-- ---------------------------------------------------------------------------
create table staff_work_settings (
  id boolean primary key default true check (id),
  start_time time not null default '09:30',
  grace_minutes int not null default 15 check (grace_minutes between 0 and 240),
  timezone text not null default 'Asia/Kolkata',
  work_days int[] not null default '{1,2,3,4,5}'
);
insert into staff_work_settings default values;

alter table staff_work_settings enable row level security;
create policy "manager and Hanbee staff read the working hours"
  on staff_work_settings for select using (is_manager() or is_hanbee_staff());
create policy "only the manager changes the working hours"
  on staff_work_settings for update using (is_manager()) with check (is_manager());

-- Lateness is decided by the server from the settings, never by the client.
create or replace function guard_time_entry_write()
returns trigger as $$
declare
  s staff_work_settings;
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.work_date < current_date - 1 or new.work_date > current_date + 1 then
      raise exception 'work_date must be today';
    end if;
    new.clock_in := now();
    new.clock_out := null;
    select * into s from staff_work_settings limit 1;
    new.on_time := (new.clock_in at time zone s.timezone)::time <= s.start_time + make_interval(mins => s.grace_minutes);
  else
    new.staff_id := old.staff_id;
    new.work_date := old.work_date;
    new.clock_in := old.clock_in;
    new.on_time := old.on_time;
    if new.clock_out is not null and old.clock_out is null then
      new.clock_out := now();
    else
      new.clock_out := old.clock_out;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security invoker set search_path = public;

-- ---------------------------------------------------------------------------
-- Attendance, one row per day. Own record for Hanbee staff; the manager may
-- ask for anyone's. Status: present, late, absent, holiday, off, today (not
-- clocked in yet), upcoming.
-- ---------------------------------------------------------------------------
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
      when t.id is not null then case when t.on_time then 'present' else 'late' end
      when h.id is not null then 'holiday'
      when not (extract(isodow from d)::int = any (s.work_days)) then 'off'
      when d::date > current_date then 'upcoming'
      when d::date = current_date then 'today'
      else 'absent'
    end,
    t.clock_in, t.clock_out,
    case when t.clock_in is not null
         then round((extract(epoch from (coalesce(t.clock_out, now()) - t.clock_in)) / 3600.0)::numeric, 1) end,
    t.on_time, h.name
  from generate_series(v_from::timestamp, v_to::timestamp, interval '1 day') d
  left join staff_time_entries t on t.staff_id = v_staff and t.work_date = d::date
  left join holidays h on h.holiday_date = d::date and h.scope in ('staff', 'center')
  order by d desc;
end;
$$ language plpgsql stable security definer set search_path = public;

-- The manager's performance table, now with attendance and task priority.
drop function hanbee_staff_overview();
create function hanbee_staff_overview()
returns table (
  staff_id uuid, full_name text, email text, approved boolean, account_status text,
  hours_last_7_days numeric, days_worked_last_30 int, late_days_last_30 int, absent_days_last_30 int,
  open_tasks int, high_priority_open int, done_tasks int, last_clock_in timestamptz
) as $$
begin
  if not is_manager() then raise exception 'only the manager may view this'; end if;
  return query
  select p.id, p.full_name, p.email, p.approved, p.account_status::text,
    coalesce((select round(sum(extract(epoch from (coalesce(t.clock_out, now()) - t.clock_in)) / 3600.0)::numeric, 1)
                from staff_time_entries t where t.staff_id = p.id and t.work_date >= current_date - 7), 0),
    (select count(*)::int from staff_time_entries t where t.staff_id = p.id and t.work_date >= current_date - 30),
    (select count(*)::int from staff_attendance(p.id, current_date - 29, current_date) a where a.status = 'late'),
    (select count(*)::int from staff_attendance(p.id, current_date - 29, current_date) a where a.status = 'absent'),
    (select count(*)::int from staff_tasks k where k.staff_id = p.id and not k.done),
    (select count(*)::int from staff_tasks k where k.staff_id = p.id and not k.done and k.priority = 'high'),
    (select count(*)::int from staff_tasks k where k.staff_id = p.id and k.done),
    (select max(t.clock_in) from staff_time_entries t where t.staff_id = p.id)
  from profiles p
  where p.role = 'staff'
  order by p.full_name;
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function staff_attendance(uuid, date, date), hanbee_staff_overview() from public, anon;
grant execute on function staff_attendance(uuid, date, date), hanbee_staff_overview() to authenticated;
