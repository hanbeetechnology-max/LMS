-- staff_time_entries: the insert/update policies only constrain staff_id =
-- auth.uid(), so a staff member could insert a backdated row or rewrite their
-- own clock_in/on_time. Proven live: an authenticated staff account inserted
-- a row with work_date 400 days ago and on_time = true. Nothing legitimate
-- needs client-chosen timestamps (managers only read these rows), so the
-- server now owns them. Same trigger pattern as 0010.

create or replace function guard_time_entry_write()
returns trigger as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- work_date is client-supplied (the client's local "today"), so only
    -- reject dates that can't be today anywhere on Earth rather than forcing
    -- the UTC date, which would be wrong for part of every day in local time.
    if new.work_date < current_date - 1 or new.work_date > current_date + 1 then
      raise exception 'work_date must be today';
    end if;
    new.clock_in := now();
    new.clock_out := null;
    new.on_time := true;
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

create trigger staff_time_entries_guard
before insert or update on staff_time_entries
for each row execute function guard_time_entry_write();
