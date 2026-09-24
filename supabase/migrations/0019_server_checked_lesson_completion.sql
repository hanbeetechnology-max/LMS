-- S1 (docs/SECURITY_PLAN.md): lesson completion must be decided by the server.
-- Proven live: a student could `insert into lesson_completions` for every
-- lesson directly, skipping the video, the quiz and the unlock order. The
-- browser enforced those rules; the database did not. Completion now goes
-- through complete_lesson(), which mirrors the rules the lesson viewer already
-- shows (StudentLessonViewerPage): enrolled, earlier lessons done first, and
-- an unlocked quiz submission when the lesson has a quiz.

create or replace function complete_lesson(p_lesson_id uuid)
returns void as $$
declare
  v_course uuid;
  v_module_sort int;
  v_lesson_sort int;
  v_enrollment uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select m.course_id, m.sort_order, l.sort_order
    into v_course, v_module_sort, v_lesson_sort
  from lessons l join modules m on m.id = l.module_id
  where l.id = p_lesson_id and l.published;

  if v_course is null then
    raise exception 'lesson not found';
  end if;

  select e.id into v_enrollment
  from enrollments e join sections s on s.id = e.section_id
  where s.course_id = v_course
    and e.student_id = auth.uid()
    and e.status in ('active', 'completed')
  limit 1;

  if v_enrollment is null then
    raise exception 'not enrolled in this course';
  end if;

  if exists (
    select 1
    from lessons l2 join modules m2 on m2.id = l2.module_id
    where m2.course_id = v_course
      and l2.published
      and (m2.sort_order, l2.sort_order, l2.id) < (v_module_sort, v_lesson_sort, p_lesson_id)
      and not exists (
        select 1 from lesson_completions c
        where c.enrollment_id = v_enrollment and c.lesson_id = l2.id
      )
  ) then
    raise exception 'complete the earlier lessons first';
  end if;

  if exists (select 1 from assessments a where a.lesson_id = p_lesson_id)
     and not exists (
       select 1
       from assessments a
       join assessment_submissions s on s.assessment_id = a.id and s.enrollment_id = v_enrollment
       where a.lesson_id = p_lesson_id
         and (s.status = 'verified' or now() >= s.auto_unlock_at)
     ) then
    raise exception 'the lesson quiz is not unlocked yet';
  end if;

  insert into lesson_completions (enrollment_id, lesson_id)
  values (v_enrollment, p_lesson_id)
  on conflict do nothing;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function complete_lesson(uuid) from public, anon;
grant execute on function complete_lesson(uuid) to authenticated;

drop policy "a student marks their own lesson complete" on lesson_completions;
