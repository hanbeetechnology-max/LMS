-- A `notifications` table, `notify_assessment_submission()` trigger function,
-- and its trigger on assessment_submissions already exist on the live
-- database (58 real rows) but were never captured in any migration - the
-- exact same gap as 0045's auto-confirm trigger. A rebuild from migrations
-- alone would silently lose the whole feature. This tracks it as-is first,
-- then extends it: adds optional kind/body columns, read/unread helper
-- RPCs, and wires five more privileged decisions into the same table via a
-- new create_notification() helper - school verify/reject, tournament team
-- decided, course application decided, and a team invitation sent. A sixth
-- candidate from the survey, "task assigned" (staff_tasks), was dropped:
-- the RLS policy only allows staff_id = auth.uid() on insert, so tasks are
-- always self-created - there is no other party to notify.
--
-- The existing notify_assessment_submission() behavior (notify every staff
-- and manager profile on every submission, not scoped to who actually owns
-- that course) is left exactly as-is here - re-scoping it is a separate,
-- later improvement, not part of this migration.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  link_to text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Was NOT NULL on the live table; some of the new notification call sites
-- below have no link, so this is relaxed.
alter table notifications alter column link_to drop not null;
alter table notifications add column if not exists kind text;
alter table notifications add column if not exists body text;

do $$ begin
  alter table notifications add constraint notifications_title_length check (char_length(title) <= 200);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table notifications add constraint notifications_link_length check (link_to is null or char_length(link_to) <= 300);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table notifications add constraint notifications_body_length check (body is null or char_length(body) <= 1000);
exception when duplicate_object then null; end $$;

create index if not exists notifications_user_unread_idx on notifications (user_id, read, created_at desc);

alter table notifications enable row level security;

drop policy if exists "a user reads only their own notifications" on notifications;
create policy "a user reads only their own notifications"
  on notifications for select
  using (user_id = auth.uid());

-- Marking read is the one client-writable path, and only for your own rows.
drop policy if exists "a user marks only their own notifications read" on notifications;
create policy "a user marks only their own notifications read"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function notify_assessment_submission()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into notifications (user_id, title, link_to, kind)
  select id, 'A student submitted a knowledge check', '/staff/dashboard', 'assessment_submitted'
  from profiles
  where role in ('staff', 'manager');
  return new;
end;
$function$;

drop trigger if exists assessment_submission_notification on assessment_submissions;
create trigger assessment_submission_notification
  after insert on assessment_submissions
  for each row execute function notify_assessment_submission();

-- Clients never insert directly - only create_notification(), called from
-- inside other SECURITY DEFINER functions, can create a row.
create or replace function create_notification(p_user uuid, p_kind text, p_title text, p_body text default null, p_link text default null)
returns void as $$
  insert into public.notifications (user_id, kind, title, body, link_to)
  select p_user, p_kind, p_title, p_body, p_link
  where p_user is not null;
$$ language sql security definer set search_path = public;

revoke all on function create_notification(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function mark_notification_read(p_id uuid)
returns void as $$
begin
  update notifications set read = true where id = p_id and user_id = auth.uid() and read = false;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function mark_all_notifications_read()
returns void as $$
begin
  update notifications set read = true where user_id = auth.uid() and read = false;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function unread_notification_count()
returns int as $$
  select count(*)::int from notifications where user_id = auth.uid() and read = false;
$$ language sql stable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- Wire into the five existing privileged-decision RPCs.
-- ----------------------------------------------------------------------------

create or replace function verify_school(p_org uuid)
returns jsonb as $$
declare
  org organizations;
  v_owner uuid;
  v_by text;
begin
  if not (is_manager() or is_hanbee_staff()) then
    raise exception 'only the manager or Hanbee staff may verify a school';
  end if;
  select * into org from organizations where id = p_org for update;
  if org.id is null then raise exception 'school not found'; end if;
  if org.status <> 'pending' then
    select full_name into v_by from profiles where id = org.verified_by;
    return jsonb_build_object('result', 'already_decided', 'status', org.status, 'by', v_by);
  end if;

  update organizations set status = 'active', verified_by = auth.uid(), verified_at = now() where id = p_org;
  select user_id into v_owner from organization_members where org_id = p_org and member_role = 'owner' and status = 'active' limit 1;
  perform set_config('app.trusted_profile_write', 'true', true);
  update profiles set approved = true where id = v_owner;
  perform set_config('app.trusted_profile_write', '', true);
  perform log_audit('verify_school', 'organization', p_org, '{}'::jsonb);
  perform create_notification(v_owner, 'school_verified', 'Your school has been verified',
    org.name || ' is now active on HanbeeLms.', '/dashboard/school/overview');
  return jsonb_build_object('result', 'verified');
end;
$$ language plpgsql security definer set search_path = public;

create or replace function reject_school(p_org uuid)
returns jsonb as $$
declare
  org organizations;
  v_owner uuid;
  v_by text;
begin
  if not (is_manager() or is_hanbee_staff()) then
    raise exception 'only the manager or Hanbee staff may reject a school';
  end if;
  select * into org from organizations where id = p_org for update;
  if org.id is null then raise exception 'school not found'; end if;
  if org.status <> 'pending' then
    select full_name into v_by from profiles where id = org.verified_by;
    return jsonb_build_object('result', 'already_decided', 'status', org.status, 'by', v_by);
  end if;
  update organizations set status = 'closed', verified_by = auth.uid(), verified_at = now() where id = p_org;
  select user_id into v_owner from organization_members where org_id = p_org and member_role = 'owner' and status = 'active' limit 1;
  perform log_audit('reject_school', 'organization', p_org, '{}'::jsonb);
  perform create_notification(v_owner, 'school_rejected', 'Your school registration was not approved',
    org.name || ' could not be verified. Contact Hanbee staff for details.', null);
  return jsonb_build_object('result', 'rejected');
end;
$$ language plpgsql security definer set search_path = public;

create or replace function decide_team(p_team uuid, p_decision text)
returns void as $$
declare t tournament_teams;
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'only Hanbee staff may decide on a team'; end if;
  if p_decision not in ('verified', 'rejected') then raise exception 'decision must be verified or rejected'; end if;
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null then raise exception 'team not found'; end if;
  if t.status not in ('applied', 'payment_declared') then raise exception 'only an applied team can be decided'; end if;
  perform set_config('app.trusted_portal_write', 'true', true);
  update tournament_teams set status = p_decision::team_status, decided_by = auth.uid(), decided_at = now() where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);
  perform log_audit('decide_team', 'tournament_team', p_team, jsonb_build_object('decision', p_decision));
  perform create_notification(t.created_by,
    case when p_decision = 'verified' then 'team_verified' else 'team_rejected' end,
    case when p_decision = 'verified' then 'Your team has been verified' else 'Your team application was rejected' end,
    t.name, '/dashboard/team');
end;
$$ language plpgsql security definer set search_path = public;

create or replace function decide_course_application(p_application uuid, p_decision text, p_section uuid default null)
returns void as $$
declare a applications;
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'only Hanbee staff may decide on an application'; end if;
  if p_decision not in ('verified', 'rejected') then raise exception 'decision must be verified or rejected'; end if;
  select * into a from applications where id = p_application for update;
  if a.id is null then raise exception 'application not found'; end if;
  if a.status not in ('applied', 'payment_declared') then raise exception 'this application is already decided'; end if;
  if p_decision = 'verified' then
    if p_section is null or not exists (select 1 from sections where id = p_section and course_id = a.course_id) then
      raise exception 'a section of this course is required to verify';
    end if;
    if not exists (select 1 from profiles where id = a.applicant_id and role = 'student' and account_status = 'active') then
      raise exception 'the applicant is not an active student';
    end if;
    insert into enrollments (section_id, student_id, status) values (p_section, a.applicant_id, 'active')
    on conflict (section_id, student_id) do update set status = 'active';
  end if;
  perform set_config('app.trusted_portal_write', 'true', true);
  update applications set status = p_decision::application_status, decided_by = auth.uid(), decided_at = now()
  where id = p_application;
  perform set_config('app.trusted_portal_write', '', true);
  perform log_audit('decide_course_application', 'application', p_application,
    jsonb_build_object('decision', p_decision, 'section_id', p_section));
  perform create_notification(a.applicant_id,
    case when p_decision = 'verified' then 'application_verified' else 'application_rejected' end,
    case when p_decision = 'verified' then 'Your course application was approved' else 'Your course application was rejected' end,
    (select title from courses where id = a.course_id), '/dashboard/courses');
end;
$$ language plpgsql security definer set search_path = public;

create or replace function verify_assessment_submission(p_submission_id uuid)
returns assessment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  submission assessment_submissions;
  v_student uuid;
  v_title text;
begin
  if not is_staff_or_manager() then
    raise exception 'Only staff or managers can verify submissions';
  end if;

  update assessment_submissions
  set status = 'verified'::assessment_submission_status,
      verified_at = now()
  where id = p_submission_id
  returning * into submission;

  if submission.id is null then
    raise exception 'Assessment submission not found';
  end if;

  select e.student_id, a.title into v_student, v_title
  from enrollments e join assessments a on a.id = submission.assessment_id
  where e.id = submission.enrollment_id;
  perform create_notification(v_student, 'assessment_verified', 'Your assessment has been reviewed',
    coalesce(v_title, 'An assessment') || ' was verified.', '/dashboard/courses');

  return submission;
end;
$$;

create or replace function invite_to_team(p_team uuid, p_student uuid)
returns uuid as $$
declare
  t tournament_teams;
  v_size int;
  v_members int;
  v_pending int;
  v_id uuid;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or t.org_id is null then raise exception 'team not found'; end if;
  if not (t.captain_id = auth.uid() or can_manage_org(t.org_id)) then raise exception 'only the captain or school staff can invite'; end if;
  if t.status <> 'draft' then raise exception 'the team can only change while it is being formed'; end if;
  if not exists (
    select 1 from organization_members m join profiles p on p.id = m.user_id
    where m.user_id = p_student and m.org_id = t.org_id and m.status = 'active' and m.member_role = 'student'
      and p.role = 'student' and p.account_status = 'active'
  ) then raise exception 'you can only invite students of your own school'; end if;
  if exists (
    select 1 from tournament_team_members m join tournament_teams x on x.id = m.team_id
    where m.tournament_id = t.tournament_id and m.student_id = p_student and x.status not in ('withdrawn', 'rejected')
  ) then raise exception 'this student is already in a team for this tournament'; end if;
  select team_size into v_size from tournaments where id = t.tournament_id;
  select count(*) into v_members from tournament_team_members where team_id = p_team;
  select count(*) into v_pending from team_invitations where team_id = p_team and status = 'pending';
  if v_members + v_pending >= v_size then raise exception 'there are no open spots left for more invitations'; end if;
  begin
    insert into team_invitations (team_id, tournament_id, student_id, invited_by)
    values (p_team, t.tournament_id, p_student, auth.uid()) returning id into v_id;
  exception when unique_violation then
    raise exception 'this student has already been invited';
  end;
  perform create_notification(p_student, 'team_invitation', 'You have been invited to a team',
    t.name, '/dashboard/team');
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;
