-- Add filtering and pagination to the quiz review queue: "no filters despite
-- being expected" was flagged twice by QA. Same shape as 0042's school
-- directory search: drop the old zero-arg overload first (Postgres treats a
-- new parameter list as a distinct function, not a replacement).

drop function if exists list_assessment_reviews();

create or replace function list_assessment_reviews(p_status text default null, p_search text default null, p_limit int default 25, p_offset int default 0)
returns table (
  submission_id uuid, student_id uuid, student_name text, student_email text, school_name text,
  course_id uuid, course_title text, lesson_title text, assessment_title text,
  score numeric, passed boolean, status text, unlocked boolean,
  submitted_at timestamptz, auto_unlock_at timestamptz, verified_at timestamptz
) as $$
begin
  if not (is_manager() or is_hanbee_staff() or coalesce(my_role() = 'school_staff', false)) then
    raise exception 'not allowed';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then p_limit := 25; end if;
  if p_offset is null or p_offset < 0 then p_offset := 0; end if;
  return query
  select s.id, e.student_id, p.full_name, p.email, o.name,
         c.id, c.title, l.title, a.title,
         s.score, s.passed, s.status::text,
         (s.status::text = 'verified' or now() >= s.auto_unlock_at),
         s.submitted_at, s.auto_unlock_at, s.verified_at
  from assessment_submissions s
  join assessments a on a.id = s.assessment_id
  join lessons l on l.id = a.lesson_id
  join modules m on m.id = l.module_id
  join courses c on c.id = m.course_id
  join enrollments e on e.id = s.enrollment_id
  join profiles p on p.id = e.student_id
  left join lateral (
    select org.name
    from organization_members om join organizations org on org.id = om.org_id
    where om.user_id = e.student_id
    order by (om.status = 'active') desc, om.joined_at desc
    limit 1
  ) o on true
  where (is_manager() or is_hanbee_staff() or is_student_in_my_school(e.student_id))
    and (p_status is null or p_status = '' or s.status::text = p_status)
    and (p_search is null or p_search = '' or p.full_name ilike '%' || p_search || '%' or p.email ilike '%' || p_search || '%' or c.title ilike '%' || p_search || '%')
  order by (s.status::text = 'pending') desc, s.submitted_at desc
  limit p_limit offset p_offset;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function list_assessment_reviews_count(p_status text default null, p_search text default null)
returns int as $$
begin
  if not (is_manager() or is_hanbee_staff() or coalesce(my_role() = 'school_staff', false)) then
    raise exception 'not allowed';
  end if;
  return (
    select count(*)::int
    from assessment_submissions s
    join enrollments e on e.id = s.enrollment_id
    join profiles p on p.id = e.student_id
    join assessments a on a.id = s.assessment_id
    join lessons l on l.id = a.lesson_id
    join modules m on m.id = l.module_id
    join courses c on c.id = m.course_id
    where (is_manager() or is_hanbee_staff() or is_student_in_my_school(e.student_id))
      and (p_status is null or p_status = '' or s.status::text = p_status)
      and (p_search is null or p_search = '' or p.full_name ilike '%' || p_search || '%' or p.email ilike '%' || p_search || '%' or c.title ilike '%' || p_search || '%')
  );
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function list_assessment_reviews(text, text, int, int), list_assessment_reviews_count(text, text) from public, anon;
grant execute on function list_assessment_reviews(text, text, int, int), list_assessment_reviews_count(text, text) to authenticated;
