-- HanbeeLms — Row Level Security
-- Every table gets RLS enabled and an explicit policy set — Supabase denies
-- all access by default once RLS is on, so "no policy" means "no access,"
-- not "open." A helper function reads the caller's role/id from `profiles`
-- via auth.uid(), since that's the only identity Postgres trusts here.

create function my_role() returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

create function is_staff_or_manager() returns boolean as $$
  select my_role() in ('staff', 'manager');
$$ language sql stable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;

create policy "profiles are readable by any signed-in user"
  on profiles for select
  using (auth.uid() is not null);

create policy "a user can update only their own profile"
  on profiles for update
  using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- courses / sections / modules / lessons / materials
-- Everyone signed in can read published content; only staff/manager can write.
-- Draft courses are staff/manager-only to read (so students can't see WIP).
-- ----------------------------------------------------------------------------
alter table courses enable row level security;
alter table sections enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table lesson_materials enable row level security;

create policy "published courses readable by all; drafts staff/manager only"
  on courses for select
  using (status = 'published' or is_staff_or_manager());

create policy "staff/manager manage courses"
  on courses for all
  using (is_staff_or_manager()) with check (is_staff_or_manager());

create policy "sections readable by all signed in"
  on sections for select using (auth.uid() is not null);
create policy "staff/manager manage sections"
  on sections for all using (is_staff_or_manager()) with check (is_staff_or_manager());

create policy "modules readable by all signed in"
  on modules for select using (auth.uid() is not null);
create policy "staff/manager manage modules"
  on modules for all using (is_staff_or_manager()) with check (is_staff_or_manager());

create policy "published lessons readable by all; drafts staff/manager only"
  on lessons for select
  using (published or is_staff_or_manager());
create policy "staff/manager manage lessons"
  on lessons for all using (is_staff_or_manager()) with check (is_staff_or_manager());

create policy "materials readable if the lesson is readable"
  on lesson_materials for select
  using (exists (select 1 from lessons l where l.id = lesson_id and (l.published or is_staff_or_manager())));
create policy "staff/manager manage materials"
  on lesson_materials for all using (is_staff_or_manager()) with check (is_staff_or_manager());

-- ----------------------------------------------------------------------------
-- enrollments — a student sees only their own row; staff/manager see all.
-- ----------------------------------------------------------------------------
alter table enrollments enable row level security;
alter table lesson_completions enable row level security;

create policy "a student sees their own enrollment; staff/manager see all"
  on enrollments for select
  using (student_id = auth.uid() or is_staff_or_manager());
create policy "staff/manager manage enrollments"
  on enrollments for all using (is_staff_or_manager()) with check (is_staff_or_manager());

create policy "a student sees/marks their own completions; staff/manager see all"
  on lesson_completions for select
  using (
    is_staff_or_manager()
    or exists (select 1 from enrollments e where e.id = enrollment_id and e.student_id = auth.uid())
  );
create policy "a student marks their own lesson complete"
  on lesson_completions for insert
  with check (exists (select 1 from enrollments e where e.id = enrollment_id and e.student_id = auth.uid()));
create policy "a student can un-mark their own completion"
  on lesson_completions for delete
  using (exists (select 1 from enrollments e where e.id = enrollment_id and e.student_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- manual attendance — staff/manager only (this is *their* marking tool)
-- ----------------------------------------------------------------------------
alter table class_sessions enable row level security;
alter table attendance_marks enable row level security;

create policy "class sessions readable by all signed in"
  on class_sessions for select using (auth.uid() is not null);
create policy "staff/manager manage class sessions"
  on class_sessions for all using (is_staff_or_manager()) with check (is_staff_or_manager());

create policy "a student sees their own attendance marks; staff/manager see all"
  on attendance_marks for select
  using (
    is_staff_or_manager()
    or exists (select 1 from enrollments e where e.id = enrollment_id and e.student_id = auth.uid())
  );
create policy "staff/manager mark attendance"
  on attendance_marks for all using (is_staff_or_manager()) with check (is_staff_or_manager());

-- ----------------------------------------------------------------------------
-- autonomous attendance sessions — a user manages only their own row;
-- staff/manager can read everyone's (this is what AutoAttendancePanel shows).
-- ----------------------------------------------------------------------------
alter table auto_attendance_sessions enable row level security;

create policy "a user sees their own sessions; staff/manager see all"
  on auto_attendance_sessions for select
  using (user_id = auth.uid() or is_staff_or_manager());
create policy "a user creates/updates only their own session"
  on auto_attendance_sessions for insert with check (user_id = auth.uid());
create policy "a user heartbeats only their own session"
  on auto_attendance_sessions for update using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- announcements — audience-scoped read, staff/manager write.
-- Mirrors backend/app/store.py's announcements_for() logic exactly.
-- ----------------------------------------------------------------------------
alter table announcements enable row level security;

create policy "announcements visible per audience, or to their own author"
  on announcements for select
  using (
    audience = 'all'
    or audience::text = my_role()::text
    or author_id = auth.uid()
  );
create policy "staff/manager post announcements"
  on announcements for insert with check (is_staff_or_manager());

-- ----------------------------------------------------------------------------
-- certificates — a user reads their own; verification is via a SECURITY
-- DEFINER RPC (see 0003_functions.sql) so the *unauthenticated* verify page
-- doesn't need a public SELECT policy exposing every certificate.
-- ----------------------------------------------------------------------------
alter table certificates enable row level security;

create policy "a user reads their own certificates; staff/manager read all"
  on certificates for select
  using (user_id = auth.uid() or is_staff_or_manager());
create policy "a user issues only their own certificate"
  on certificates for insert with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- discussions — readable by all signed in; anyone can post; only the
-- author (or staff/manager) can edit/delete their own post.
-- ----------------------------------------------------------------------------
alter table discussion_threads enable row level security;
alter table discussion_posts enable row level security;

create policy "threads readable by all signed in"
  on discussion_threads for select using (auth.uid() is not null);
create policy "any signed-in user starts a thread"
  on discussion_threads for insert with check (auth.uid() = author_id);
create policy "author or staff/manager manages a thread"
  on discussion_threads for update using (author_id = auth.uid() or is_staff_or_manager());
create policy "author or staff/manager deletes a thread"
  on discussion_threads for delete using (author_id = auth.uid() or is_staff_or_manager());

create policy "posts readable by all signed in"
  on discussion_posts for select using (auth.uid() is not null);
create policy "any signed-in user replies"
  on discussion_posts for insert with check (auth.uid() = author_id);
create policy "author or staff/manager edits a post"
  on discussion_posts for update using (author_id = auth.uid() or is_staff_or_manager());
create policy "author or staff/manager deletes a post"
  on discussion_posts for delete using (author_id = auth.uid() or is_staff_or_manager());

-- ----------------------------------------------------------------------------
-- messages — only participants of a conversation can read/write it.
-- ----------------------------------------------------------------------------
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

create policy "a participant sees their own conversations"
  on conversations for select
  using (exists (select 1 from conversation_participants p where p.conversation_id = id and p.user_id = auth.uid()));

create policy "a participant sees the participant list of their conversations"
  on conversation_participants for select
  using (exists (select 1 from conversation_participants p2 where p2.conversation_id = conversation_id and p2.user_id = auth.uid()));

create policy "a participant reads messages in their conversations"
  on messages for select
  using (exists (select 1 from conversation_participants p where p.conversation_id = conversation_id and p.user_id = auth.uid()));
create policy "a participant sends messages as themselves"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (select 1 from conversation_participants p where p.conversation_id = conversation_id and p.user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- notifications — strictly per-user.
-- ----------------------------------------------------------------------------
alter table notifications enable row level security;

create policy "a user reads only their own notifications"
  on notifications for select using (user_id = auth.uid());
create policy "a user marks only their own notifications read"
  on notifications for update using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- staff tasks & time entries — a staff member manages only their own;
-- manager can read all (for the rollup pages).
-- ----------------------------------------------------------------------------
alter table staff_tasks enable row level security;
alter table staff_time_entries enable row level security;

create policy "a staff member manages their own tasks; manager reads all"
  on staff_tasks for select using (staff_id = auth.uid() or my_role() = 'manager');
create policy "a staff member writes only their own tasks"
  on staff_tasks for insert with check (staff_id = auth.uid());
create policy "a staff member updates only their own tasks"
  on staff_tasks for update using (staff_id = auth.uid());
create policy "a staff member deletes only their own tasks"
  on staff_tasks for delete using (staff_id = auth.uid());

create policy "a staff member reads their own time entries; manager reads all"
  on staff_time_entries for select using (staff_id = auth.uid() or my_role() = 'manager');
create policy "a staff member writes only their own time entries"
  on staff_time_entries for insert with check (staff_id = auth.uid());
create policy "a staff member updates only their own time entries"
  on staff_time_entries for update using (staff_id = auth.uid());

-- ----------------------------------------------------------------------------
-- manager: verifications, holidays — manager/staff only.
-- ----------------------------------------------------------------------------
alter table verification_applicants enable row level security;
alter table holidays enable row level security;

create policy "staff/manager manage verification applicants"
  on verification_applicants for all using (is_staff_or_manager()) with check (is_staff_or_manager());

create policy "holidays readable by all signed in"
  on holidays for select using (auth.uid() is not null);
create policy "manager manages holidays"
  on holidays for insert with check (my_role() = 'manager');
create policy "manager updates holidays"
  on holidays for update using (my_role() = 'manager');
create policy "manager deletes holidays"
  on holidays for delete using (my_role() = 'manager');

-- ----------------------------------------------------------------------------
-- course_applications — public can insert (the /apply page has no login),
-- only staff/manager can read the inbox.
-- ----------------------------------------------------------------------------
alter table course_applications enable row level security;

create policy "anyone (including anonymous) can submit an application"
  on course_applications for insert with check (true);
create policy "staff/manager read applications"
  on course_applications for select using (is_staff_or_manager());

-- ----------------------------------------------------------------------------
-- invitations — staff/manager only.
-- ----------------------------------------------------------------------------
alter table invitations enable row level security;

create policy "staff/manager manage invitations"
  on invitations for all using (is_staff_or_manager()) with check (is_staff_or_manager());
