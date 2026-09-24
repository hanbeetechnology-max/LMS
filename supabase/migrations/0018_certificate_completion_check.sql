-- HanbeeLms 0018 — certificate completion check, discussion moderation
-- guards, invitation privilege guards. See docs/PLAN.md.

-- 1. issue_certificate now requires the caller to have completed every
--    published lesson of the (published) course.
create or replace function issue_certificate(p_course_title text)
returns certificates as $$
declare
  result certificates;
  v_course uuid;
  v_enrollment uuid;
  v_total int;
  v_done int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_course from courses
   where title = p_course_title and status = 'published' limit 1;
  if v_course is null then
    raise exception 'course not found';
  end if;

  select count(*) into v_total
    from lessons l join modules m on m.id = l.module_id
   where m.course_id = v_course and l.published;
  if v_total = 0 then
    raise exception 'course has no published lessons';
  end if;

  -- best enrollment = the one with the most completed published lessons
  select e.id, count(distinct lc.lesson_id) into v_enrollment, v_done
    from enrollments e
    join sections s on s.id = e.section_id and s.course_id = v_course
    left join lesson_completions lc on lc.enrollment_id = e.id
     and exists (select 1 from lessons l join modules m on m.id = l.module_id
                  where l.id = lc.lesson_id and m.course_id = v_course and l.published)
   where e.student_id = auth.uid()
   group by e.id
   order by 2 desc
   limit 1;
  if v_enrollment is null then
    raise exception 'not enrolled in this course';
  end if;
  if v_done < v_total then
    raise exception 'course not completed (% of % lessons)', v_done, v_total;
  end if;

  insert into certificates (user_id, course_title, serial)
  values (
    auth.uid(),
    p_course_title,
    'HBL-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  )
  on conflict (user_id, course_title) do nothing
  returning * into result;

  if result.id is null then
    select * into result from certificates where user_id = auth.uid() and course_title = p_course_title;
  end if;

  return result;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. discussion_threads: only staff/manager may pin/lock; author/course immutable.
create or replace function guard_discussion_thread() returns trigger as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if not is_staff_or_manager() then
      new.pinned := false;
      new.locked := false;
    end if;
  else
    if new.author_id is distinct from old.author_id or new.course_id is distinct from old.course_id then
      raise exception 'author_id/course_id are immutable';
    end if;
    if not is_staff_or_manager() and
       (new.pinned is distinct from old.pinned or new.locked is distinct from old.locked) then
      raise exception 'only staff may pin or lock threads';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_guard_discussion_thread
  before insert or update on discussion_threads
  for each row execute function guard_discussion_thread();

-- 3. discussion_posts: no posting into locked threads (except staff); author/thread immutable.
create or replace function guard_discussion_post() returns trigger as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if not is_staff_or_manager()
       and exists (select 1 from discussion_threads t where t.id = new.thread_id and t.locked) then
      raise exception 'thread is locked';
    end if;
  else
    if new.author_id is distinct from old.author_id or new.thread_id is distinct from old.thread_id then
      raise exception 'author_id/thread_id are immutable';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_guard_discussion_post
  before insert or update on discussion_posts
  for each row execute function guard_discussion_post();

-- 4. invitations: invited_by forced to caller; only managers may invite non-student
--    roles (handle_new_user grants the invite's role, pre-approved, at signup).
create or replace function guard_invitation() returns trigger as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.invited_by := auth.uid();
  else
    new.invited_by := old.invited_by;
  end if;
  if new.role <> 'student' and my_role() <> 'manager' then
    raise exception 'only a manager may invite staff or manager accounts';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_guard_invitation
  before insert or update on invitations
  for each row execute function guard_invitation();
