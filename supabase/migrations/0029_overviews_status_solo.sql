-- Multi-school platform, step 6: what each dashboard reads (overview
-- functions), and the ways an account or a school is suspended, closed,
-- revoked, converted to solo, or joined.
--
-- Monitoring rule (user decision): the system watches course participation
-- only (lessons, completions, quizzes). Nothing here tracks students beyond
-- that. Hanbee staff clock in and out; the manager sees that summary.

-- ---------------------------------------------------------------------------
-- Internal: per-enrollment progress. Not callable by clients; only the
-- SECURITY DEFINER functions below use it after checking who is asking.
-- ---------------------------------------------------------------------------
create or replace function internal_enrollment_progress()
returns table (
  enrollment_id uuid, student_id uuid, course_id uuid, section_id uuid,
  status text, enrolled_date date, completed int, total int, last_activity timestamptz
) as $$
  select
    e.id, e.student_id, s.course_id, e.section_id, e.status::text, e.enrolled_date,
    (select count(*)::int from lesson_completions lc
       join lessons l on l.id = lc.lesson_id and l.published
      where lc.enrollment_id = e.id),
    (select count(*)::int from lessons l join modules m on m.id = l.module_id
      where m.course_id = s.course_id and l.published),
    greatest(
      (select max(lc.completed_at) from lesson_completions lc where lc.enrollment_id = e.id),
      (select max(a.submitted_at) from assessment_submissions a where a.enrollment_id = e.id)
    )
  from enrollments e join sections s on s.id = e.section_id;
$$ language sql stable security definer set search_path = public;

revoke all on function internal_enrollment_progress() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- A school's overview (school staff for their own school; Hanbee staff and the
-- manager for any school). Tournament and LMS sides in one call.
-- ---------------------------------------------------------------------------
create or replace function school_overview(p_org uuid)
returns jsonb as $$
declare
  o organizations;
  res jsonb;
begin
  if not can_manage_org(p_org) then
    raise exception 'not allowed';
  end if;
  select * into o from organizations where id = p_org;
  if o.id is null then raise exception 'school not found'; end if;

  select jsonb_build_object(
    'school', jsonb_build_object(
      'id', o.id, 'name', o.name, 'status', o.status, 'registration_no', o.registration_no,
      'official_email', o.official_email, 'created_at', o.created_at, 'verified_at', o.verified_at,
      'verified_by', (select full_name from profiles where id = o.verified_by)
    ),
    'people', jsonb_build_object(
      'owners', (select count(*) from organization_members where org_id = p_org and status = 'active' and member_role = 'owner'),
      'staff', (select count(*) from organization_members where org_id = p_org and status = 'active' and member_role = 'staff'),
      'students', (select count(*) from organization_members where org_id = p_org and status = 'active' and member_role = 'student'),
      'pending_invites', (select count(*) from invitations
                           where org_id = p_org and role = 'student' and not accepted
                             and revoked_at is null and expires_at > now())
    ),
    'tournament', jsonb_build_object(
      'teams_total', (select count(*) from tournament_teams where org_id = p_org),
      'teams_by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                            from (select status::text as status, count(*) as n
                                    from tournament_teams where org_id = p_org group by 1) s),
      'participants', (select count(distinct m.student_id)
                         from tournament_team_members m join tournament_teams t on t.id = m.team_id
                        where t.org_id = p_org and t.status::text not in ('rejected', 'withdrawn')),
      'next_tournament', (select jsonb_build_object('id', t.id, 'title', t.title, 'starts_at', t.starts_at,
                                                    'venue', t.venue, 'status', t.status)
                            from tournaments t where t.status::text in ('upcoming', 'live')
                           order by t.starts_at limit 1),
      'best_rank', (select min(r.rank) from tournament_results r join tournament_teams t on t.id = r.team_id
                     where t.org_id = p_org)
    ),
    'lms', (
      select jsonb_build_object(
        'students_enrolled', count(distinct p.student_id),
        'enrollments', count(*),
        'lessons_completed', coalesce(sum(p.completed), 0),
        'avg_completion_pct', coalesce(round(avg(case when p.total > 0 then 100.0 * p.completed / p.total end)), 0)
      )
      from internal_enrollment_progress() p
      join organization_members m on m.user_id = p.student_id and m.org_id = p_org
                                  and m.status = 'active' and m.member_role = 'student'
      where p.status in ('active', 'completed')
    )
  ) into res;
  return res;
end;
$$ language plpgsql stable security definer set search_path = public;

-- Each of a school's students with their team and course progress.
create or replace function school_students(p_org uuid)
returns table (
  student_id uuid, full_name text, email text, joined_at timestamptz, account_status text,
  team_name text, team_status text,
  courses_enrolled int, lessons_completed int, lessons_total int, completion_pct int, last_active timestamptz
) as $$
begin
  if not can_manage_org(p_org) then raise exception 'not allowed'; end if;
  return query
  select
    m.user_id, p.full_name, p.email, m.joined_at, p.account_status::text,
    (select t.name from tournament_team_members tm join tournament_teams t on t.id = tm.team_id
      where tm.student_id = m.user_id and tm.org_id_at_join = p_org and t.status::text <> 'withdrawn'
      order by tm.joined_at desc limit 1),
    (select t.status::text from tournament_team_members tm join tournament_teams t on t.id = tm.team_id
      where tm.student_id = m.user_id and tm.org_id_at_join = p_org and t.status::text <> 'withdrawn'
      order by tm.joined_at desc limit 1),
    coalesce(count(ep.enrollment_id) filter (where ep.status in ('active', 'completed')), 0)::int,
    coalesce(sum(ep.completed) filter (where ep.status in ('active', 'completed')), 0)::int,
    coalesce(sum(ep.total) filter (where ep.status in ('active', 'completed')), 0)::int,
    case when coalesce(sum(ep.total) filter (where ep.status in ('active', 'completed')), 0) > 0
         then round(100.0 * sum(ep.completed) filter (where ep.status in ('active', 'completed'))
                    / sum(ep.total) filter (where ep.status in ('active', 'completed')))::int
         else 0 end,
    max(ep.last_activity)
  from organization_members m
  join profiles p on p.id = m.user_id
  left join internal_enrollment_progress() ep on ep.student_id = m.user_id
  where m.org_id = p_org and m.status = 'active' and m.member_role = 'student'
  group by m.user_id, p.full_name, p.email, m.joined_at, p.account_status
  order by p.full_name;
end;
$$ language plpgsql stable security definer set search_path = public;

-- Courses and how a school's students are doing in them (read-only view for
-- school staff; Hanbee staff and the manager can read any school).
create or replace function school_course_participation(p_org uuid)
returns table (course_id uuid, title text, students int, avg_completion_pct int) as $$
begin
  if not can_manage_org(p_org) then raise exception 'not allowed'; end if;
  return query
  select c.id, c.title, count(distinct ep.student_id)::int,
         coalesce(round(avg(case when ep.total > 0 then 100.0 * ep.completed / ep.total end)), 0)::int
  from courses c
  join internal_enrollment_progress() ep on ep.course_id = c.id and ep.status in ('active', 'completed')
  join organization_members m on m.user_id = ep.student_id and m.org_id = p_org
                              and m.status = 'active' and m.member_role = 'student'
  where c.status = 'published'
  group by c.id, c.title
  order by c.title;
end;
$$ language plpgsql stable security definer set search_path = public;

-- One course, every participating student: the Hanbee staff course table.
-- School staff get the same shape but only for their own school's students.
-- "New" means enrolled in the last 14 days.
create or replace function course_students(p_course uuid)
returns table (
  student_id uuid, full_name text, email text, org_id uuid, org_name text, org_status text, is_solo boolean,
  enrollment_id uuid, section_name text, status text, enrolled_on date,
  completed int, total int, completion_pct int, last_activity timestamptz, is_new boolean
) as $$
begin
  if my_role() not in ('staff', 'manager', 'school_staff') then raise exception 'not allowed'; end if;
  return query
  select
    ep.student_id, p.full_name, p.email,
    lm.org_id, o.name, o.status::text, p.is_solo,
    ep.enrollment_id, s.name, ep.status, ep.enrolled_date,
    ep.completed, ep.total,
    case when ep.total > 0 then round(100.0 * ep.completed / ep.total)::int else 0 end,
    ep.last_activity,
    ep.enrolled_date >= current_date - 14
  from internal_enrollment_progress() ep
  join profiles p on p.id = ep.student_id
  join sections s on s.id = ep.section_id
  left join lateral (
    select m.org_id from organization_members m where m.user_id = ep.student_id
    order by (m.status = 'active') desc, m.joined_at desc limit 1
  ) lm on true
  left join organizations o on o.id = lm.org_id
  where ep.course_id = p_course
    and (is_manager() or is_hanbee_staff() or is_student_in_my_school(ep.student_id))
  order by p.full_name;
end;
$$ language plpgsql stable security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- Site-wide views for Hanbee staff and the manager.
-- ---------------------------------------------------------------------------
create or replace function school_directory()
returns table (
  org_id uuid, name text, status text, owner_name text, owner_email text,
  students int, teams int, participants int, created_at timestamptz, verified_by text
) as $$
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'not allowed'; end if;
  return query
  select o.id, o.name, o.status::text,
    (select p.full_name from organization_members m join profiles p on p.id = m.user_id
      where m.org_id = o.id and m.member_role = 'owner' order by m.joined_at limit 1),
    (select p.email from organization_members m join profiles p on p.id = m.user_id
      where m.org_id = o.id and m.member_role = 'owner' order by m.joined_at limit 1),
    (select count(*)::int from organization_members m where m.org_id = o.id and m.status = 'active' and m.member_role = 'student'),
    (select count(*)::int from tournament_teams t where t.org_id = o.id),
    (select count(distinct tm.student_id)::int from tournament_team_members tm join tournament_teams t on t.id = tm.team_id
      where t.org_id = o.id and t.status::text not in ('rejected', 'withdrawn')),
    o.created_at,
    (select full_name from profiles where id = o.verified_by)
  from organizations o
  order by (o.status = 'pending') desc, o.created_at desc;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function site_tournament_overview()
returns jsonb as $$
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'tournaments', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                      from (select status::text as status, count(*) n from tournaments group by 1) s),
    'teams', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                from (select status::text as status, count(*) n from tournament_teams group by 1) s),
    'schools_with_teams', (select count(distinct org_id) from tournament_teams where org_id is not null),
    'solo_teams', (select count(*) from tournament_teams where org_id is null),
    'participants', (select count(distinct m.student_id) from tournament_team_members m
                       join tournament_teams t on t.id = m.team_id
                      where t.status::text not in ('rejected', 'withdrawn')),
    'teams_awaiting_decision', (select count(*) from tournament_teams where status::text in ('applied', 'payment_declared'))
  );
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function site_lms_overview()
returns jsonb as $$
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'courses', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                  from (select status::text as status, count(*) n from courses group by 1) s),
    'students', (select count(*) from profiles where role = 'student' and account_status = 'active'),
    'solo_students', (select count(*) from profiles where role = 'student' and is_solo and account_status = 'active'),
    'enrollments', (select count(*) from enrollments where status::text in ('active', 'completed')),
    'avg_completion_pct', (select coalesce(round(avg(case when p.total > 0 then 100.0 * p.completed / p.total end)), 0)
                             from internal_enrollment_progress() p where p.status in ('active', 'completed')),
    'course_applications_pending', (select count(*) from applications where status::text in ('applied', 'payment_declared')),
    'schools', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                  from (select status::text as status, count(*) n from organizations group by 1) s)
  );
end;
$$ language plpgsql stable security definer set search_path = public;

-- The manager's view of Hanbee staff: hours and tasks. View only.
create or replace function hanbee_staff_overview()
returns table (
  staff_id uuid, full_name text, email text, approved boolean, account_status text,
  hours_last_7_days numeric, days_worked_last_30 int, open_tasks int, done_tasks int, last_clock_in timestamptz
) as $$
begin
  if not is_manager() then raise exception 'only the manager may view this'; end if;
  return query
  select p.id, p.full_name, p.email, p.approved, p.account_status::text,
    coalesce((select round(sum(extract(epoch from (coalesce(t.clock_out, now()) - t.clock_in)) / 3600.0)::numeric, 1)
                from staff_time_entries t where t.staff_id = p.id and t.work_date >= current_date - 7), 0),
    (select count(*)::int from staff_time_entries t where t.staff_id = p.id and t.work_date >= current_date - 30),
    (select count(*)::int from staff_tasks k where k.staff_id = p.id and not k.done),
    (select count(*)::int from staff_tasks k where k.staff_id = p.id and k.done),
    (select max(t.clock_in) from staff_time_entries t where t.staff_id = p.id)
  from profiles p
  where p.role = 'staff'
  order by p.full_name;
end;
$$ language plpgsql stable security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- Status changes. Hanbee staff may suspend or revoke school staff and students;
-- only the manager may act on Hanbee staff or other managers; nobody on
-- themselves. Deactivating also bans sign-in and ends open sessions; every
-- data rule already checks the live status, so data closes at once too.
-- ---------------------------------------------------------------------------
create or replace function set_account_status(p_user uuid, p_status account_status, p_reason text default null)
returns void as $$
declare
  target profiles;
begin
  select * into target from profiles where id = p_user;
  if target.id is null then raise exception 'account not found'; end if;
  if p_user = auth.uid() then raise exception 'you cannot change your own status'; end if;

  if is_manager() then
    null;
  elsif is_hanbee_staff() then
    if target.role not in ('school_staff', 'student') then
      raise exception 'Hanbee staff may only act on school staff and students';
    end if;
  else
    raise exception 'not allowed';
  end if;

  perform set_config('app.trusted_profile_write', 'true', true);
  update profiles set account_status = p_status where id = p_user;
  perform set_config('app.trusted_profile_write', '', true);

  update auth.users
     set banned_until = case when p_status = 'active' then null else now() + interval '100 years' end
   where id = p_user;
  if p_status <> 'active' then
    delete from auth.sessions where user_id = p_user;
  end if;

  perform log_audit('set_account_status', 'profile', p_user,
    jsonb_build_object('status', p_status, 'reason', p_reason));
end;
$$ language plpgsql security definer set search_path = public;

-- School lifecycle after verification: active <-> suspended, and closed (final).
-- Closing ends every active membership; students keep their accounts and can
-- convert to solo or be invited by another school.
create or replace function set_school_status(p_org uuid, p_status org_status, p_reason text default null)
returns void as $$
declare
  o organizations;
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'not allowed'; end if;
  select * into o from organizations where id = p_org for update;
  if o.id is null then raise exception 'school not found'; end if;
  if p_status = 'pending' then raise exception 'use verify_school or reject_school'; end if;
  if o.status = 'pending' then raise exception 'verify or reject this school first'; end if;
  if o.status = 'closed' then raise exception 'a closed school stays closed'; end if;
  if o.status = p_status then return; end if;

  update organizations set status = p_status where id = p_org;
  if p_status = 'closed' then
    update organization_members set status = 'ended', ended_at = now()
     where org_id = p_org and status = 'active';
  end if;
  perform log_audit('set_school_status', 'organization', p_org,
    jsonb_build_object('status', p_status, 'reason', p_reason));
end;
$$ language plpgsql security definer set search_path = public;

-- A student with no school (theirs closed) converts themselves; Hanbee staff
-- or the manager may convert any student (this ends an active membership).
create or replace function convert_to_solo(p_student uuid default null)
returns void as $$
declare
  v_target uuid := coalesce(p_student, auth.uid());
  target profiles;
begin
  select * into target from profiles where id = v_target;
  if target.id is null or target.role <> 'student' or target.account_status <> 'active' then
    raise exception 'only an active student account can become solo';
  end if;

  if v_target = auth.uid() then
    if exists (select 1 from organization_members where user_id = v_target and status = 'active') then
      raise exception 'you still belong to a school';
    end if;
  elsif not (is_manager() or is_hanbee_staff()) then
    raise exception 'not allowed';
  else
    update organization_members set status = 'ended', ended_at = now()
     where user_id = v_target and status = 'active';
  end if;

  perform set_config('app.trusted_profile_write', 'true', true);
  update profiles set is_solo = true where id = v_target;
  perform set_config('app.trusted_profile_write', '', true);
  perform log_audit('convert_to_solo', 'profile', v_target, '{}'::jsonb);
end;
$$ language plpgsql security definer set search_path = public;

-- An existing student (solo, or their old school closed) joins a new school
-- with its link, if that school has invited their email.
create or replace function join_school(p_join_token text)
returns jsonb as $$
declare
  me profiles;
  org organizations;
  inv invitations;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null or me.role <> 'student' or me.account_status <> 'active' then
    raise exception 'only an active student can join a school';
  end if;
  if exists (select 1 from organization_members where user_id = me.id and status = 'active') then
    raise exception 'you already belong to a school';
  end if;
  select * into org from organizations where join_token = p_join_token and status = 'active';
  if org.id is null then raise exception 'this school link is invalid'; end if;
  select * into inv from invitations i
   where i.org_id = org.id and lower(i.email) = lower(me.email) and i.role = 'student'
     and not i.accepted and i.revoked_at is null and i.expires_at > now()
   order by i.created_at desc limit 1
   for update;
  if inv.id is null then raise exception 'this email has not been invited by the school'; end if;

  insert into organization_members (org_id, user_id, member_role) values (org.id, me.id, 'student');
  update invitations set accepted = true where id = inv.id;
  perform set_config('app.trusted_profile_write', 'true', true);
  update profiles set is_solo = false where id = me.id;
  perform set_config('app.trusted_profile_write', '', true);
  perform log_audit('join_school', 'organization', org.id, '{}'::jsonb);
  return jsonb_build_object('result', 'joined', 'school', org.name);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function school_overview(uuid), school_students(uuid), school_course_participation(uuid),
  course_students(uuid), school_directory(), site_tournament_overview(), site_lms_overview(),
  hanbee_staff_overview(), set_account_status(uuid, account_status, text),
  set_school_status(uuid, org_status, text), convert_to_solo(uuid), join_school(text)
  from public, anon;
grant execute on function school_overview(uuid), school_students(uuid), school_course_participation(uuid),
  course_students(uuid), school_directory(), site_tournament_overview(), site_lms_overview(),
  hanbee_staff_overview(), set_account_status(uuid, account_status, text),
  set_school_status(uuid, org_status, text), convert_to_solo(uuid), join_school(text)
  to authenticated;
