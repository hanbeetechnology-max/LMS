-- Multi-school platform, step 5: tenant scoping. School A must never read or
-- change school B's data, and every rule keys off the live account and school
-- status so revoking or closing takes effect at once.
--
-- Announcements: NULL org_id = site-wide (manager or Hanbee staff post);
--   org_id set = that school only (its staff post, edit and delete).
-- Calendar: owner_id set = personal (owner only); org_id set = that school;
--   neither = site-wide (manager or Hanbee staff manage).

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
alter table announcements
  add column org_id uuid references organizations(id) on delete cascade,
  add column pinned boolean not null default false,
  add column updated_at timestamptz;
create index on announcements (org_id, created_at desc);

create or replace function can_read_announcement(p_org uuid, p_audience announcement_audience, p_author uuid)
returns boolean as $$
  select is_active_account() and (
    p_author = auth.uid()
    or is_manager() or is_hanbee_staff()
    or case
      when p_org is null then
        p_audience = 'all'
        or (p_audience = 'staff' and my_role() = 'school_staff')
        or (p_audience = 'student' and my_role() = 'student')
      else
        is_org_member(p_org) and (
          p_audience = 'all'
          or (p_audience = 'staff' and my_role() = 'school_staff')
          or (p_audience = 'student' and my_role() = 'student')
        )
    end
  );
$$ language sql stable security definer set search_path = public;

drop policy "announcements visible per audience, or to their own author" on announcements;
drop policy "staff/manager post announcements" on announcements;

create policy "announcements readable per scope and audience"
  on announcements for select
  using (can_read_announcement(org_id, audience, author_id));

create policy "site-wide announcements by manager or Hanbee staff; school ones by that school's staff"
  on announcements for insert
  with check (
    is_active_account() and (
      (org_id is null and (is_manager() or is_hanbee_staff()))
      or (org_id is not null and can_manage_org(org_id))
    )
  );

create policy "announcement author, school staff or manager can edit"
  on announcements for update
  using (is_active_account() and (author_id = auth.uid() or is_manager() or (org_id is not null and can_manage_org(org_id))))
  with check (is_active_account() and (author_id = auth.uid() or is_manager() or (org_id is not null and can_manage_org(org_id))));

create policy "announcement author, school staff or manager can delete"
  on announcements for delete
  using (is_active_account() and (author_id = auth.uid() or is_manager() or (org_id is not null and can_manage_org(org_id))));

create or replace function guard_announcement() returns trigger as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
  else
    new.author_id := old.author_id;
    new.org_id := old.org_id;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$ language plpgsql security invoker set search_path = public;

create trigger trg_guard_announcement
  before insert or update on announcements
  for each row execute function guard_announcement();

-- ---------------------------------------------------------------------------
-- Calendar
-- ---------------------------------------------------------------------------
alter table calendar_events
  add column org_id uuid references organizations(id) on delete cascade,
  add column owner_id uuid references profiles(id) on delete cascade;
create index on calendar_events (org_id, starts_at);
create index on calendar_events (owner_id, starts_at);

drop policy "calendar events readable by all signed in" on calendar_events;
drop policy "staff/manager manage calendar events" on calendar_events;

create policy "calendar readable: personal to its owner, school events to that school, site-wide to all active"
  on calendar_events for select
  using (
    is_active_account() and (
      owner_id = auth.uid()
      or (owner_id is null and (
        is_manager() or is_hanbee_staff()
        or org_id is null
        or is_org_member(org_id)
      ))
    )
  );

create policy "calendar writable: own personal events, school events by that school's staff, site-wide by manager or Hanbee staff"
  on calendar_events for all
  using (
    is_active_account() and (
      (owner_id = auth.uid() and my_role() in ('staff', 'manager', 'school_staff'))
      or (owner_id is null and org_id is null and (is_manager() or is_hanbee_staff()))
      or (owner_id is null and org_id is not null and can_manage_org(org_id))
    )
  )
  with check (
    is_active_account() and (
      (owner_id = auth.uid() and org_id is null and my_role() in ('staff', 'manager', 'school_staff'))
      or (owner_id is null and org_id is null and (is_manager() or is_hanbee_staff()))
      or (owner_id is null and org_id is not null and can_manage_org(org_id))
    )
  );

create or replace function guard_calendar_event() returns trigger as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.org_id := old.org_id;
    new.owner_id := old.owner_id;
  end if;
  return new;
end;
$$ language plpgsql security invoker set search_path = public;

create trigger trg_guard_calendar_event
  before insert or update on calendar_events
  for each row execute function guard_calendar_event();

-- ---------------------------------------------------------------------------
-- Enrollments: a school's staff may READ (never write) their own students'.
-- ---------------------------------------------------------------------------
create or replace function is_student_in_my_school(p_student uuid)
returns boolean as $$
  select coalesce(my_role() = 'school_staff', false) and exists (
    select 1
    from organization_members me
    join organizations o on o.id = me.org_id and o.status = 'active'
    join organization_members st on st.org_id = me.org_id
    where me.user_id = auth.uid() and me.status = 'active' and me.member_role in ('owner', 'staff')
      and st.user_id = p_student and st.status = 'active' and st.member_role = 'student'
  );
$$ language sql stable security definer set search_path = public;

grant execute on function is_student_in_my_school(uuid) to authenticated;

create policy "school staff read enrollments of their own school's students"
  on enrollments for select
  using (is_student_in_my_school(student_id));

-- ---------------------------------------------------------------------------
-- Discussions: only people with a reason to be in a course may read or post.
-- ---------------------------------------------------------------------------
create or replace function can_access_thread(p_thread uuid)
returns boolean as $$
  select is_active_account() and exists (
    select 1 from discussion_threads t
    where t.id = p_thread and (is_staff_or_manager() or is_enrolled_in_course(t.course_id))
  );
$$ language sql stable security definer set search_path = public;

grant execute on function can_access_thread(uuid) to authenticated;

drop policy "threads readable by all signed in" on discussion_threads;
drop policy "any signed-in user starts a thread" on discussion_threads;
drop policy "posts readable by all signed in" on discussion_posts;
drop policy "any signed-in user replies" on discussion_posts;

create policy "threads readable by staff/manager or students enrolled in the course"
  on discussion_threads for select
  using (is_active_account() and (is_staff_or_manager() or is_enrolled_in_course(course_id)));
create policy "threads started by staff/manager or students enrolled in the course"
  on discussion_threads for insert
  with check (auth.uid() = author_id and is_active_account() and (is_staff_or_manager() or is_enrolled_in_course(course_id)));
create policy "posts readable where the thread is accessible"
  on discussion_posts for select using (can_access_thread(thread_id));
create policy "replies allowed where the thread is accessible"
  on discussion_posts for insert with check (auth.uid() = author_id and can_access_thread(thread_id));

-- ---------------------------------------------------------------------------
-- Old public tournament registration: registration now goes through school
-- teams (0027). The table stays for history; anonymous inserts are closed.
-- ---------------------------------------------------------------------------
drop policy "anyone (including anonymous) can register for the tournament" on tournament_registrations;

-- ---------------------------------------------------------------------------
-- Enrollment gating honours revocation (0020 used only the enrollment row).
-- ---------------------------------------------------------------------------
create or replace function is_enrolled_in_course(p_course_id uuid)
returns boolean as $$
  select is_active_account() and exists (
    select 1
    from enrollments e
    join sections s on s.id = e.section_id
    where s.course_id = p_course_id
      and e.student_id = auth.uid()
      and e.status in ('active', 'completed')
  );
$$ language sql stable security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- Profile visibility (replaces 0021): adds the school relationships and the
-- active-account requirement.
--   * school staff see their own school's members;
--   * members see their school's owner and staff.
-- ---------------------------------------------------------------------------
create or replace function can_see_profile(p_profile_id uuid)
returns boolean as $$
  select
    is_active_account()
    and (
      p_profile_id = auth.uid()
      or is_staff_or_manager()
      or exists (
        select 1 from profiles p
        where p.id = p_profile_id and p.role in ('staff', 'manager') and p.approved and p.account_status = 'active'
      )
      or exists (
        select 1
        from organization_members mine
        join organization_members theirs on theirs.org_id = mine.org_id and theirs.status = 'active'
        where mine.user_id = auth.uid() and mine.status = 'active'
          and theirs.user_id = p_profile_id
          and (mine.member_role in ('owner', 'staff') or theirs.member_role in ('owner', 'staff'))
      )
      or exists (
        select 1
        from conversation_participants mine
        join conversation_participants theirs on theirs.conversation_id = mine.conversation_id
        where mine.user_id = auth.uid() and theirs.user_id = p_profile_id
      )
      or exists (
        select 1 from discussion_threads t
        where t.author_id = p_profile_id and is_enrolled_in_course(t.course_id)
      )
      or exists (
        select 1
        from discussion_posts dp
        join discussion_threads t on t.id = dp.thread_id
        where dp.author_id = p_profile_id and is_enrolled_in_course(t.course_id)
      )
    );
$$ language sql stable security definer set search_path = public;

-- Lesson completion refuses suspended or revoked accounts (replaces 0019's body).
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
  if not is_active_account() then
    raise exception 'account is not active';
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

