-- Small read functions the dashboards need.
--   my_school():        the caller's latest school membership (even an ended one,
--                       so a student whose school closed can be told so).
--   my_course_progress(): a student's own courses with progress.
--   course_stats():     Hanbee staff and the manager: each course with how many
--                       students take it and their average completion.

create or replace function my_school()
returns table (org_id uuid, name text, status text, member_role text, member_status text) as $$
  select o.id, o.name, o.status::text, m.member_role::text, m.status::text
  from organization_members m
  join organizations o on o.id = m.org_id
  where m.user_id = auth.uid()
  order by (m.status = 'active') desc, m.joined_at desc
  limit 1;
$$ language sql stable security definer set search_path = public;

create or replace function my_course_progress()
returns table (
  enrollment_id uuid, course_id uuid, course_title text, section_name text, status text,
  enrolled_on date, completed int, total int, completion_pct int, last_activity timestamptz
) as $$
  select ep.enrollment_id, ep.course_id, c.title, s.name, ep.status, ep.enrolled_date,
         ep.completed, ep.total,
         case when ep.total > 0 then round(100.0 * ep.completed / ep.total)::int else 0 end,
         ep.last_activity
  from internal_enrollment_progress() ep
  join courses c on c.id = ep.course_id
  join sections s on s.id = ep.section_id
  where ep.student_id = auth.uid() and is_active_account()
  order by ep.enrolled_date desc;
$$ language sql stable security definer set search_path = public;

create or replace function course_stats()
returns table (
  course_id uuid, title text, description text, status text, cover_accent text,
  students int, avg_completion_pct int, new_students int
) as $$
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'not allowed'; end if;
  return query
  select c.id, c.title, c.description, c.status::text, c.cover_accent,
    (select count(distinct ep.student_id)::int from internal_enrollment_progress() ep
      where ep.course_id = c.id and ep.status in ('active', 'completed')),
    coalesce((select round(avg(case when ep.total > 0 then 100.0 * ep.completed / ep.total end))::int
                from internal_enrollment_progress() ep
               where ep.course_id = c.id and ep.status in ('active', 'completed')), 0),
    (select count(distinct ep.student_id)::int from internal_enrollment_progress() ep
      where ep.course_id = c.id and ep.status in ('active', 'completed') and ep.enrolled_date >= current_date - 14)
  from courses c
  order by c.created_at desc;
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function my_school(), my_course_progress(), course_stats() from public, anon;
grant execute on function my_school(), my_course_progress(), course_stats() to authenticated;
