-- Lesson reviews and certificates: read functions for the staff screens.
--
--   list_assessment_reviews()   quiz submissions students hand in after a video
--                               lesson, with who, where, score, status and when
--                               the 10-minute soft deadline auto-unlocks them.
--   list_certificates_overview() every issued certificate, with the student
--                               and their school.
--
-- Access: the manager and Hanbee staff see everything; school staff see only
-- their own school's students (is_student_in_my_school, migration 0028).
-- Students already read their own rows directly (existing RLS).

create or replace function list_assessment_reviews()
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
  where is_manager() or is_hanbee_staff() or is_student_in_my_school(e.student_id)
  order by (s.status::text = 'pending') desc, s.submitted_at desc;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function list_certificates_overview()
returns table (
  certificate_id uuid, serial text, course_title text, issued_at timestamptz,
  student_id uuid, student_name text, student_email text, school_name text
) as $$
begin
  if not (is_manager() or is_hanbee_staff() or coalesce(my_role() = 'school_staff', false)) then
    raise exception 'not allowed';
  end if;
  return query
  select c.id, c.serial, c.course_title, c.issued_at, c.user_id, p.full_name, p.email, o.name
  from certificates c
  join profiles p on p.id = c.user_id
  left join lateral (
    select org.name
    from organization_members om join organizations org on org.id = om.org_id
    where om.user_id = c.user_id
    order by (om.status = 'active') desc, om.joined_at desc
    limit 1
  ) o on true
  where is_manager() or is_hanbee_staff() or is_student_in_my_school(c.user_id)
  order by c.issued_at desc;
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function list_assessment_reviews(), list_certificates_overview() from public, anon;
grant execute on function list_assessment_reviews(), list_certificates_overview() to authenticated;
