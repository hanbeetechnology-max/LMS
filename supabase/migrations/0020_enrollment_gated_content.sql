-- S2 (docs/SECURITY_PLAN.md): course content must only be readable by people
-- with a reason to see it. Before this, the lessons policy was
-- `published or is_staff_or_manager()` with no login requirement, and modules
-- were readable by any signed-in user, so lesson text, links and video ids
-- were readable without enrolling (and, for lessons, without signing in).
-- Staff and managers are unchanged; students need an active or completed
-- enrollment in a section of the lesson's course. The public course catalog
-- (`courses`) stays open on purpose.

create or replace function is_enrolled_in_course(p_course_id uuid)
returns boolean as $$
  select exists (
    select 1
    from enrollments e
    join sections s on s.id = e.section_id
    where s.course_id = p_course_id
      and e.student_id = auth.uid()
      and e.status in ('active', 'completed')
  );
$$ language sql stable security definer set search_path = public;

grant execute on function is_enrolled_in_course(uuid) to authenticated;

drop policy "modules readable by all signed in" on modules;
create policy "modules readable by staff/manager or enrolled students"
  on modules for select
  using (is_staff_or_manager() or is_enrolled_in_course(course_id));

drop policy "published lessons readable by all; drafts staff/manager only" on lessons;
create policy "lessons readable by staff/manager, or published to enrolled students"
  on lessons for select
  using (
    is_staff_or_manager()
    or (
      published
      and exists (
        select 1 from modules m
        where m.id = module_id and is_enrolled_in_course(m.course_id)
      )
    )
  );
