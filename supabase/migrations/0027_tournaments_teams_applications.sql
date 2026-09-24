-- Tournaments as TEAMS, leaderboard, and course applications.
--
-- Rules baked in here:
--  * No client can write any of these tables. Every change goes through a
--    SECURITY DEFINER function that checks the caller's role and that their
--    account and school are active. INSERT/UPDATE/DELETE are also revoked at
--    the privilege level, and trust triggers (the 0010 pattern) pin status and
--    payment fields for anything that is not a trusted function.
--  * payment_declared is only a CLAIM. Hanbee staff decide (verified/rejected).
--  * org_id_at_join is a snapshot: records stay attributed to the school the
--    student joined under even if that school later closes.
--  * The existing tournament_registrations table stays dormant.

create type tournament_status as enum ('upcoming', 'live', 'completed');
create type team_status as enum ('draft', 'applied', 'payment_declared', 'verified', 'rejected', 'withdrawn');
create type application_kind as enum ('course');
create type application_status as enum ('applied', 'payment_declared', 'verified', 'rejected');

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null default '',
  status tournament_status not null default 'upcoming',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create table tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  org_id uuid references organizations(id) on delete restrict, -- null = solo team of one
  name text not null check (length(trim(name)) > 0),
  status team_status not null default 'draft',
  payment_declared boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  decided_by uuid references profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tournament_id, name),
  unique (id, tournament_id)
);
create index on tournament_teams (org_id);

create table tournament_team_members (
  team_id uuid not null,
  tournament_id uuid not null,
  student_id uuid not null references profiles(id) on delete cascade,
  org_id_at_join uuid references organizations(id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (team_id, student_id),
  foreign key (team_id, tournament_id) references tournament_teams (id, tournament_id) on delete cascade,
  unique (tournament_id, student_id)
);
create index on tournament_team_members (student_id);

create table tournament_results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null,
  team_id uuid not null,
  rank int not null check (rank >= 1),
  points int not null default 0 check (points >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  foreign key (team_id, tournament_id) references tournament_teams (id, tournament_id) on delete cascade,
  unique (tournament_id, team_id)
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  kind application_kind not null default 'course',
  course_id uuid not null references courses(id) on delete cascade,
  applicant_id uuid not null references profiles(id) on delete cascade,
  org_id_at_join uuid references organizations(id) on delete set null,
  status application_status not null default 'applied',
  payment_declared boolean not null default false,
  decided_by uuid references profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (course_id, applicant_id)
);
create index on applications (applicant_id);
create index on applications (org_id_at_join);

-- ----------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER: read past RLS, cannot recurse)
-- ----------------------------------------------------------------------------

-- Tournaments and the leaderboard: manager, Hanbee staff, staff of an ACTIVE
-- school, students with an active school, or solo students. A student whose
-- school closed (and who is not solo) sees nothing.
create or replace function can_see_tournaments() returns boolean as $$
  select coalesce(
    is_manager() or is_hanbee_staff()
    or (my_role() = 'school_staff' and my_org_id() is not null)
    or (my_role() = 'student' and (
          my_org_id() is not null
          or coalesce((select is_solo from public.profiles where id = auth.uid()), false)
       )),
    false);
$$ language sql stable security definer set search_path = public;

create or replace function is_team_member(p_team uuid) returns boolean as $$
  select exists (select 1 from public.tournament_team_members
                 where team_id = p_team and student_id = auth.uid());
$$ language sql stable security definer set search_path = public;

-- Detail visibility of one team.
create or replace function team_visible(p_team uuid) returns boolean as $$
  select coalesce(
    is_manager() or is_hanbee_staff()
    or exists (
      select 1 from public.tournament_teams t
      where t.id = p_team and t.org_id is not null
        and my_role() = 'school_staff' and t.org_id = my_org_id())
    or (my_role() = 'student' and can_see_tournaments() and is_team_member(p_team)),
    false);
$$ language sql stable security definer set search_path = public;

create or replace function is_solo_student() returns boolean as $$
  select coalesce(my_role() = 'student', false)
     and my_org_id() is null
     and coalesce((select is_solo from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;

-- Does the caller run this team? School staff of its school, or the solo owner.
create or replace function can_run_team(p_team public.tournament_teams) returns boolean as $$
  select case
    when p_team.org_id is not null then coalesce(my_role() = 'school_staff' and my_org_id() = p_team.org_id, false)
    else is_solo_student() and p_team.created_by = auth.uid()
  end;
$$ language sql stable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- Trust triggers (0010 pattern). Trusted functions set the flag; nothing else
-- may choose status or payment fields.
-- ----------------------------------------------------------------------------
create or replace function guard_team_trust() returns trigger as $$
begin
  if auth.uid() is null or coalesce(current_setting('app.trusted_portal_write', true), '') = 'true' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.payment_declared := false;
    new.decided_by := null;
    new.decided_at := null;
  else
    new.status := old.status;
    new.payment_declared := old.payment_declared;
    new.decided_by := old.decided_by;
    new.decided_at := old.decided_at;
    new.org_id := old.org_id;
    new.tournament_id := old.tournament_id;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$ language plpgsql security invoker set search_path = public;
create trigger tournament_teams_trust before insert or update on tournament_teams
  for each row execute function guard_team_trust();

create or replace function guard_application_trust() returns trigger as $$
begin
  if auth.uid() is null or coalesce(current_setting('app.trusted_portal_write', true), '') = 'true' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'applied';
    new.payment_declared := false;
    new.decided_by := null;
    new.decided_at := null;
  else
    new.status := old.status;
    new.payment_declared := old.payment_declared;
    new.decided_by := old.decided_by;
    new.decided_at := old.decided_at;
    new.course_id := old.course_id;
    new.applicant_id := old.applicant_id;
    new.org_id_at_join := old.org_id_at_join;
  end if;
  return new;
end;
$$ language plpgsql security invoker set search_path = public;
create trigger applications_trust before insert or update on applications
  for each row execute function guard_application_trust();

-- ----------------------------------------------------------------------------
-- RLS: read-only for clients.
-- ----------------------------------------------------------------------------
alter table tournaments enable row level security;
alter table tournament_teams enable row level security;
alter table tournament_team_members enable row level security;
alter table tournament_results enable row level security;
alter table applications enable row level security;

revoke all on tournaments, tournament_teams, tournament_team_members, tournament_results, applications from anon;
revoke insert, update, delete, truncate on tournaments, tournament_teams, tournament_team_members,
  tournament_results, applications from authenticated;

create policy "tournaments visible to eligible accounts" on tournaments for select
  using (can_see_tournaments());

create policy "teams visible per scope" on tournament_teams for select
  using (team_visible(id));

create policy "team members visible per scope" on tournament_team_members for select
  using (team_visible(team_id));

-- Raw results only for Hanbee; everyone else uses get_leaderboard().
create policy "staff read raw results" on tournament_results for select
  using (is_manager() or is_hanbee_staff());

create policy "applications visible per scope" on applications for select
  using (
    is_manager() or is_hanbee_staff()
    or (my_role() = 'school_staff' and org_id_at_join is not null and org_id_at_join = my_org_id())
    or (applicant_id = auth.uid() and is_active_account())
  );

-- ----------------------------------------------------------------------------
-- Tournament functions (Hanbee staff / manager)
-- ----------------------------------------------------------------------------
create or replace function create_tournament(p_title text, p_description text, p_starts_at timestamptz,
  p_ends_at timestamptz, p_venue text)
returns uuid as $$
declare v_id uuid;
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'only Hanbee staff may create tournaments'; end if;
  if p_ends_at < p_starts_at then raise exception 'end must not be before start'; end if;
  insert into tournaments (title, description, starts_at, ends_at, venue, created_by)
  values (trim(p_title), coalesce(p_description, ''), p_starts_at, p_ends_at, coalesce(p_venue, ''), auth.uid())
  returning id into v_id;
  perform log_audit('create_tournament', 'tournament', v_id, jsonb_build_object('title', p_title));
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function update_tournament(p_id uuid, p_title text, p_description text, p_starts_at timestamptz,
  p_ends_at timestamptz, p_venue text, p_status tournament_status)
returns void as $$
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'only Hanbee staff may edit tournaments'; end if;
  if p_ends_at < p_starts_at then raise exception 'end must not be before start'; end if;
  update tournaments set title = trim(p_title), description = coalesce(p_description, ''), starts_at = p_starts_at,
    ends_at = p_ends_at, venue = coalesce(p_venue, ''), status = p_status where id = p_id;
  if not found then raise exception 'tournament not found'; end if;
  perform log_audit('update_tournament', 'tournament', p_id, jsonb_build_object('status', p_status));
end;
$$ language plpgsql security definer set search_path = public;

create or replace function set_result(p_tournament uuid, p_team uuid, p_rank int, p_points int, p_notes text)
returns uuid as $$
declare v_id uuid;
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'only Hanbee staff may set results'; end if;
  if not exists (select 1 from tournament_teams where id = p_team and tournament_id = p_tournament and status = 'verified') then
    raise exception 'results can only be set for a verified team of this tournament';
  end if;
  insert into tournament_results (tournament_id, team_id, rank, points, notes)
  values (p_tournament, p_team, p_rank, p_points, coalesce(p_notes, ''))
  on conflict (tournament_id, team_id) do update set rank = excluded.rank, points = excluded.points, notes = excluded.notes
  returning id into v_id;
  perform log_audit('set_result', 'tournament', p_tournament, jsonb_build_object('team_id', p_team, 'rank', p_rank, 'points', p_points));
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function delete_result(p_tournament uuid, p_team uuid)
returns void as $$
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'only Hanbee staff may change results'; end if;
  delete from tournament_results where tournament_id = p_tournament and team_id = p_team;
  perform log_audit('delete_result', 'tournament', p_tournament, jsonb_build_object('team_id', p_team));
end;
$$ language plpgsql security definer set search_path = public;

-- Leaderboard: team name and school name only.
create or replace function get_leaderboard(p_tournament uuid)
returns table (team_id uuid, team_name text, school_name text, rank int, points int, notes text) as $$
  select r.team_id, t.name, o.name, r.rank, r.points, r.notes
  from public.tournament_results r
  join public.tournament_teams t on t.id = r.team_id
  left join public.organizations o on o.id = t.org_id
  where r.tournament_id = p_tournament and can_see_tournaments()
  order by r.rank, r.points desc;
$$ language sql stable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- Team functions
-- ----------------------------------------------------------------------------
create or replace function create_team(p_tournament uuid, p_name text)
returns uuid as $$
declare
  v_org uuid := my_org_id();
  v_id uuid;
begin
  if my_role() is distinct from 'school_staff' or v_org is null then
    raise exception 'only staff of an active school may create a team';
  end if;
  if not exists (select 1 from tournaments where id = p_tournament and status = 'upcoming') then
    raise exception 'this tournament is not open for teams';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'team name is required'; end if;
  begin
    perform set_config('app.trusted_portal_write', 'true', true);
    insert into tournament_teams (tournament_id, org_id, name, created_by)
    values (p_tournament, v_org, trim(p_name), auth.uid()) returning id into v_id;
    perform set_config('app.trusted_portal_write', '', true);
  exception when unique_violation then
    perform set_config('app.trusted_portal_write', '', true);
    raise exception 'a team with this name already exists in this tournament';
  end;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function create_solo_team(p_tournament uuid)
returns uuid as $$
declare
  v_id uuid;
  v_name text;
begin
  if not is_solo_student() then raise exception 'only a solo student may enter as a team of one'; end if;
  if not exists (select 1 from tournaments where id = p_tournament and status = 'upcoming') then
    raise exception 'this tournament is not open for teams';
  end if;
  if exists (select 1 from tournament_team_members where tournament_id = p_tournament and student_id = auth.uid()) then
    raise exception 'you are already in a team for this tournament';
  end if;
  select full_name into v_name from profiles where id = auth.uid();
  perform set_config('app.trusted_portal_write', 'true', true);
  begin
    insert into tournament_teams (tournament_id, org_id, name, created_by)
    values (p_tournament, null, v_name, auth.uid()) returning id into v_id;
  exception when unique_violation then
    -- another entrant with the same display name
    insert into tournament_teams (tournament_id, org_id, name, created_by)
    values (p_tournament, null, v_name || ' (' || substr(auth.uid()::text, 1, 4) || ')', auth.uid()) returning id into v_id;
  end;
  perform set_config('app.trusted_portal_write', '', true);
  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (v_id, p_tournament, auth.uid(), null);
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function add_team_member(p_team uuid, p_student uuid)
returns void as $$
declare t tournament_teams;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or t.org_id is null or not can_run_team(t) then raise exception 'not allowed'; end if;
  if t.status <> 'draft' then raise exception 'the team can only change while it is a draft'; end if;
  if not exists (
    select 1 from organization_members m
    join profiles p on p.id = m.user_id
    where m.user_id = p_student and m.org_id = t.org_id and m.status = 'active'
      and m.member_role = 'student' and p.role = 'student' and p.account_status = 'active'
  ) then raise exception 'this student is not an active member of your school'; end if;
  if exists (select 1 from tournament_team_members where tournament_id = t.tournament_id and student_id = p_student) then
    raise exception 'this student is already in a team for this tournament';
  end if;
  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (p_team, t.tournament_id, p_student, t.org_id);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function remove_team_member(p_team uuid, p_student uuid)
returns void as $$
declare t tournament_teams;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or t.org_id is null or not can_run_team(t) then raise exception 'not allowed'; end if;
  if t.status <> 'draft' then raise exception 'the team can only change while it is a draft'; end if;
  delete from tournament_team_members where team_id = p_team and student_id = p_student;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function apply_team(p_team uuid, p_payment_declared boolean)
returns void as $$
declare t tournament_teams;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or not can_run_team(t) then raise exception 'not allowed'; end if;
  if t.status <> 'draft' then raise exception 'this team has already applied'; end if;
  if not exists (select 1 from tournaments where id = t.tournament_id and status = 'upcoming') then
    raise exception 'this tournament is not open for applications';
  end if;
  if not exists (select 1 from tournament_team_members where team_id = p_team) then
    raise exception 'a team needs at least one member to apply';
  end if;
  perform set_config('app.trusted_portal_write', 'true', true);
  update tournament_teams set
    status = case when coalesce(p_payment_declared, false) then 'payment_declared'::team_status else 'applied'::team_status end,
    payment_declared = coalesce(p_payment_declared, false)
  where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);
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
end;
$$ language plpgsql security definer set search_path = public;

create or replace function withdraw_team(p_team uuid)
returns void as $$
declare t tournament_teams;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or not (can_run_team(t) or is_manager() or is_hanbee_staff()) then raise exception 'not allowed'; end if;
  if t.status in ('rejected', 'withdrawn') then raise exception 'this team can no longer be withdrawn'; end if;
  perform set_config('app.trusted_portal_write', 'true', true);
  update tournament_teams set status = 'withdrawn' where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);
  if is_manager() or is_hanbee_staff() then
    perform log_audit('withdraw_team', 'tournament_team', p_team, '{}'::jsonb);
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- Teams the caller may see, with tournament title, school name and member count.
create or replace function list_visible_teams(p_tournament uuid default null)
returns table (id uuid, tournament_id uuid, tournament_title text, org_id uuid, school_name text, name text,
  status team_status, payment_declared boolean, member_count int, created_at timestamptz) as $$
  select t.id, t.tournament_id, tn.title, t.org_id, o.name, t.name, t.status, t.payment_declared,
    (select count(*)::int from public.tournament_team_members m where m.team_id = t.id), t.created_at
  from public.tournament_teams t
  join public.tournaments tn on tn.id = t.tournament_id
  left join public.organizations o on o.id = t.org_id
  where team_visible(t.id) and can_see_tournaments()
    and (p_tournament is null or t.tournament_id = p_tournament)
  order by tn.starts_at desc, t.name;
$$ language sql stable security definer set search_path = public;

create or replace function get_team_roster(p_team uuid)
returns table (student_id uuid, full_name text, org_id_at_join uuid, joined_at timestamptz) as $$
  select m.student_id, p.full_name, m.org_id_at_join, m.joined_at
  from public.tournament_team_members m
  join public.profiles p on p.id = m.student_id
  where m.team_id = p_team and team_visible(p_team) and can_see_tournaments()
  order by m.joined_at;
$$ language sql stable security definer set search_path = public;

-- The school's active students not yet in a team of this tournament.
create or replace function list_addable_students(p_tournament uuid)
returns table (student_id uuid, full_name text, email text) as $$
  select p.id, p.full_name, p.email
  from public.organization_members m
  join public.profiles p on p.id = m.user_id
  where my_role() = 'school_staff' and m.org_id = my_org_id() and m.status = 'active'
    and m.member_role = 'student' and p.account_status = 'active'
    and not exists (select 1 from public.tournament_team_members x
                    where x.tournament_id = p_tournament and x.student_id = p.id)
  order by p.full_name;
$$ language sql stable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- Course applications and enrollment
-- ----------------------------------------------------------------------------
create or replace function apply_for_course(p_course uuid, p_payment_declared boolean)
returns uuid as $$
declare
  v_id uuid;
  v_org uuid := my_org_id();
begin
  if my_role() is distinct from 'student' or not (v_org is not null or is_solo_student()) then
    raise exception 'only a student with an active school, or a solo student, may apply';
  end if;
  if not exists (select 1 from courses where id = p_course and status = 'published') then
    raise exception 'this course is not open for applications';
  end if;
  if exists (select 1 from enrollments e join sections s on s.id = e.section_id
             where s.course_id = p_course and e.student_id = auth.uid() and e.status in ('active', 'completed')) then
    raise exception 'you are already enrolled in this course';
  end if;
  begin
    perform set_config('app.trusted_portal_write', 'true', true);
    insert into applications (course_id, applicant_id, org_id_at_join, status, payment_declared)
    values (p_course, auth.uid(), v_org,
      case when coalesce(p_payment_declared, false) then 'payment_declared'::application_status else 'applied'::application_status end,
      coalesce(p_payment_declared, false))
    returning id into v_id;
    perform set_config('app.trusted_portal_write', '', true);
  exception when unique_violation then
    perform set_config('app.trusted_portal_write', '', true);
    raise exception 'you have already applied for this course';
  end;
  return v_id;
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
end;
$$ language plpgsql security definer set search_path = public;

create or replace function enroll_student(p_student uuid, p_section uuid)
returns uuid as $$
declare v_id uuid;
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'only Hanbee staff may enroll students'; end if;
  if not exists (select 1 from profiles where id = p_student and role = 'student' and account_status = 'active') then
    raise exception 'the student account is not active';
  end if;
  if not exists (select 1 from sections where id = p_section) then raise exception 'section not found'; end if;
  insert into enrollments (section_id, student_id, status) values (p_section, p_student, 'active')
  on conflict (section_id, student_id) do update set status = 'active'
  returning id into v_id;
  perform log_audit('enroll_student', 'enrollment', v_id, jsonb_build_object('student_id', p_student, 'section_id', p_section));
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function list_course_applications()
returns table (id uuid, course_id uuid, course_title text, applicant_id uuid, applicant_name text,
  org_id_at_join uuid, school_name text, status application_status, payment_declared boolean,
  decided_at timestamptz, created_at timestamptz) as $$
  select a.id, a.course_id, c.title, a.applicant_id, p.full_name, a.org_id_at_join, o.name, a.status,
    a.payment_declared, a.decided_at, a.created_at
  from public.applications a
  join public.courses c on c.id = a.course_id
  join public.profiles p on p.id = a.applicant_id
  left join public.organizations o on o.id = a.org_id_at_join
  where is_manager() or is_hanbee_staff()
    or (my_role() = 'school_staff' and a.org_id_at_join is not null and a.org_id_at_join = my_org_id())
    or (a.applicant_id = auth.uid() and is_active_account())
  order by a.created_at desc;
$$ language sql stable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- Grants: signed-in users only; every function checks its own caller.
-- ----------------------------------------------------------------------------
revoke all on function can_see_tournaments(), is_team_member(uuid), team_visible(uuid), is_solo_student(),
  can_run_team(tournament_teams),
  create_tournament(text, text, timestamptz, timestamptz, text),
  update_tournament(uuid, text, text, timestamptz, timestamptz, text, tournament_status),
  set_result(uuid, uuid, int, int, text), delete_result(uuid, uuid), get_leaderboard(uuid),
  create_team(uuid, text), create_solo_team(uuid), add_team_member(uuid, uuid), remove_team_member(uuid, uuid),
  apply_team(uuid, boolean), decide_team(uuid, text), withdraw_team(uuid),
  list_visible_teams(uuid), get_team_roster(uuid), list_addable_students(uuid),
  apply_for_course(uuid, boolean), decide_course_application(uuid, text, uuid), enroll_student(uuid, uuid),
  list_course_applications()
  from public, anon;
grant execute on function can_see_tournaments(), is_team_member(uuid), team_visible(uuid), is_solo_student(),
  can_run_team(tournament_teams),
  create_tournament(text, text, timestamptz, timestamptz, text),
  update_tournament(uuid, text, text, timestamptz, timestamptz, text, tournament_status),
  set_result(uuid, uuid, int, int, text), delete_result(uuid, uuid), get_leaderboard(uuid),
  create_team(uuid, text), create_solo_team(uuid), add_team_member(uuid, uuid), remove_team_member(uuid, uuid),
  apply_team(uuid, boolean), decide_team(uuid, text), withdraw_team(uuid),
  list_visible_teams(uuid), get_team_roster(uuid), list_addable_students(uuid),
  apply_for_course(uuid, boolean), decide_course_application(uuid, text, uuid), enroll_student(uuid, uuid),
  list_course_applications()
  to authenticated;
