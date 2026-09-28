-- Team formation inside a school.
--
--  1. Once a school is verified, its staff fix HOW MANY teams the school enters
--     in a tournament (school_team_slots). The limit is enforced for everyone.
--  2. A team is exactly `tournaments.team_size` players (5 by default).
--  3. Students form teams themselves: a student starts a team and becomes its
--     captain, invites classmates (same school only), invited students accept
--     or decline, and a student can be in only one team per tournament.
--  4. When the team is full the captain submits it; school staff approve it
--     (which applies it, with the payment step) or send it back with a note.
--  5. Every team gets its own group chat, kept in step with the team's members.
--     The school-wide group chat stays as it is.
--  6. team_statistics() feeds the panel inside the team chat.
-- Individual entries (org_id null) are exempt from slots, size and chat.

-- ---------------------------------------------------------------------------
-- Columns and tables
-- ---------------------------------------------------------------------------
alter table tournaments add column team_size int not null default 5 check (team_size between 2 and 12);

alter table tournament_teams
  add column captain_id uuid references profiles(id) on delete set null,
  add column staff_note text not null default '',
  add column submitted_at timestamptz;

-- A team chat is a group conversation with team_id set. org_id stays null on
-- purpose so it is never mistaken for the school-wide group (which is found by
-- org_id and kind).
alter table conversations add column team_id uuid references tournament_teams(id) on delete cascade;
create unique index conversations_one_per_team on conversations (team_id) where team_id is not null;

create table school_team_slots (
  tournament_id uuid not null references tournaments(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  max_teams int not null check (max_teams between 1 and 20),
  set_by uuid references profiles(id) on delete set null,
  set_at timestamptz not null default now(),
  primary key (tournament_id, org_id)
);
alter table school_team_slots enable row level security;
create policy "slots readable by the school, Hanbee staff and the manager"
  on school_team_slots for select
  using (is_manager() or is_hanbee_staff() or is_org_member(org_id));

create type team_invite_status as enum ('pending', 'accepted', 'declined', 'cancelled');

create table team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references tournament_teams(id) on delete cascade,
  tournament_id uuid not null references tournaments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  invited_by uuid references profiles(id) on delete set null,
  status team_invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index team_invitations_one_pending on team_invitations (team_id, student_id) where status = 'pending';
create index on team_invitations (student_id, status);

create or replace function team_visible_to_me(p_team uuid) returns boolean as $$
  select exists (
    select 1 from tournament_teams t
    where t.id = p_team and (
      is_manager() or is_hanbee_staff()
      or (t.org_id is not null and can_manage_org(t.org_id))
      or exists (select 1 from tournament_team_members m where m.team_id = t.id and m.student_id = auth.uid())
    )
  );
$$ language sql stable security definer set search_path = public;

alter table team_invitations enable row level security;
create policy "an invitation is visible to the invited student and to the team's people"
  on team_invitations for select
  using (is_active_account() and (student_id = auth.uid() or team_visible_to_me(team_id)));

revoke insert, update, delete, truncate on school_team_slots, team_invitations from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Guards: team size, school slots, and the team chat kept in step
-- ---------------------------------------------------------------------------
create or replace function enforce_team_size() returns trigger as $$
declare
  v_size int;
begin
  select team_size into v_size from tournaments where id = new.tournament_id;
  if (select count(*) from tournament_team_members where team_id = new.team_id) >= v_size then
    raise exception 'this team is full (% players)', v_size;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger trg_enforce_team_size before insert on tournament_team_members
  for each row execute function enforce_team_size();

create or replace function enforce_team_slots() returns trigger as $$
declare
  v_max int;
begin
  if new.org_id is null then return new; end if;
  select max_teams into v_max from school_team_slots where tournament_id = new.tournament_id and org_id = new.org_id;
  if v_max is null then return new; end if;
  perform pg_advisory_xact_lock(hashtext(new.tournament_id::text || new.org_id::text));
  if (select count(*) from tournament_teams
       where tournament_id = new.tournament_id and org_id = new.org_id and status not in ('withdrawn', 'rejected')) >= v_max then
    raise exception 'your school has already used all % of its team slots', v_max;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger trg_enforce_team_slots before insert on tournament_teams
  for each row execute function enforce_team_slots();

create or replace function team_chat_create() returns trigger as $$
declare
  v_conv uuid;
begin
  if new.org_id is null then return new; end if;
  insert into conversations (kind, title, team_id, created_by)
  values ('group', new.name || ' (team)', new.id, coalesce(new.captain_id, new.created_by))
  returning id into v_conv;
  insert into conversation_participants (conversation_id, user_id, member_role)
  select v_conv, m.user_id, 'admin'::chat_member_role
  from organization_members m join profiles p on p.id = m.user_id
  where m.org_id = new.org_id and m.status = 'active' and m.member_role in ('owner', 'staff') and p.account_status = 'active'
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger trg_team_chat_create after insert on tournament_teams
  for each row execute function team_chat_create();

create or replace function team_chat_rename() returns trigger as $$
begin
  if new.name is distinct from old.name then
    update conversations set title = new.name || ' (team)' where team_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger trg_team_chat_rename after update of name on tournament_teams
  for each row execute function team_chat_rename();

create or replace function team_member_added() returns trigger as $$
declare
  v_conv uuid;
  v_name text;
begin
  select id into v_conv from conversations where team_id = new.team_id;
  if v_conv is null then return new; end if;
  insert into conversation_participants (conversation_id, user_id, member_role)
  values (v_conv, new.student_id, 'member'::chat_member_role) on conflict do nothing;
  select full_name into v_name from profiles where id = new.student_id;
  perform chat_post_system(v_conv, new.student_id, coalesce(v_name, 'A student') || ' joined the team');
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger trg_team_member_added after insert on tournament_team_members
  for each row execute function team_member_added();

create or replace function team_member_removed() returns trigger as $$
declare
  v_conv uuid;
  v_name text;
  v_next uuid;
begin
  select id into v_conv from conversations where team_id = old.team_id;
  if v_conv is not null then
    select full_name into v_name from profiles where id = old.student_id;
    perform chat_post_system(v_conv, old.student_id, coalesce(v_name, 'A student') || ' left the team');
    delete from conversation_participants where conversation_id = v_conv and user_id = old.student_id and member_role = 'member';
  end if;
  -- If the captain left, the longest-standing member takes over.
  if exists (select 1 from tournament_teams where id = old.team_id and captain_id = old.student_id) then
    select student_id into v_next from tournament_team_members where team_id = old.team_id and student_id <> old.student_id order by joined_at limit 1;
    update tournament_teams set captain_id = v_next where id = old.team_id;
  end if;
  return old;
end;
$$ language plpgsql security definer set search_path = public;
create trigger trg_team_member_removed after delete on tournament_team_members
  for each row execute function team_member_removed();

-- ---------------------------------------------------------------------------
-- School staff: fix how many teams the school enters
-- ---------------------------------------------------------------------------
create or replace function set_team_slots(p_tournament uuid, p_org uuid, p_max int)
returns void as $$
declare
  v_used int;
begin
  if not can_manage_org(p_org) then raise exception 'not allowed'; end if;
  if not exists (select 1 from organizations where id = p_org and status = 'active') then raise exception 'this school is not active'; end if;
  if not exists (select 1 from tournaments where id = p_tournament and status = 'upcoming') then
    raise exception 'team slots can only be set while the tournament is upcoming';
  end if;
  if p_max is null or p_max < 1 or p_max > 20 then raise exception 'choose between 1 and 20 teams'; end if;
  select count(*) into v_used from tournament_teams
   where tournament_id = p_tournament and org_id = p_org and status not in ('withdrawn', 'rejected');
  if p_max < v_used then raise exception 'you already have % teams; withdraw one first', v_used; end if;
  insert into school_team_slots (tournament_id, org_id, max_teams, set_by, set_at)
  values (p_tournament, p_org, p_max, auth.uid(), now())
  on conflict (tournament_id, org_id) do update set max_teams = excluded.max_teams, set_by = auth.uid(), set_at = now();
  perform log_audit('set_team_slots', 'organization', p_org, jsonb_build_object('tournament', p_tournament, 'max_teams', p_max));
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- Student: start a team, invite classmates, answer invitations, leave, submit
-- ---------------------------------------------------------------------------
create or replace function student_start_team(p_tournament uuid, p_name text)
returns uuid as $$
declare
  v_org uuid := my_org_id();
  v_id uuid;
begin
  if my_role() is distinct from 'student' or v_org is null or not is_active_account() then
    raise exception 'only a student of an active school can start a team';
  end if;
  if not exists (select 1 from tournaments where id = p_tournament and status = 'upcoming') then
    raise exception 'this tournament is not open for teams';
  end if;
  if not exists (select 1 from school_team_slots where tournament_id = p_tournament and org_id = v_org) then
    raise exception 'your school staff have not opened team slots yet';
  end if;
  if exists (
    select 1 from tournament_team_members m join tournament_teams t on t.id = m.team_id
    where m.tournament_id = p_tournament and m.student_id = auth.uid() and t.status not in ('withdrawn', 'rejected')
  ) then raise exception 'you are already in a team for this tournament'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 or length(trim(p_name)) > 40 then
    raise exception 'give the team a name of up to 40 characters';
  end if;
  begin
    perform set_config('app.trusted_portal_write', 'true', true);
    insert into tournament_teams (tournament_id, org_id, name, created_by, captain_id)
    values (p_tournament, v_org, trim(p_name), auth.uid(), auth.uid()) returning id into v_id;
    perform set_config('app.trusted_portal_write', '', true);
  exception when unique_violation then
    perform set_config('app.trusted_portal_write', '', true);
    raise exception 'a team with this name already exists in this tournament';
  end;
  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (v_id, p_tournament, auth.uid(), v_org);
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

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
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function respond_team_invitation(p_invitation uuid, p_accept boolean)
returns void as $$
declare
  i team_invitations;
  t tournament_teams;
begin
  select * into i from team_invitations where id = p_invitation for update;
  if i.id is null or i.student_id <> auth.uid() then raise exception 'not allowed'; end if;
  if i.status <> 'pending' then raise exception 'this invitation has already been answered'; end if;
  if not coalesce(p_accept, false) then
    update team_invitations set status = 'declined', decided_at = now() where id = i.id;
    return;
  end if;
  select * into t from tournament_teams where id = i.team_id for update;
  if t.status <> 'draft' then
    update team_invitations set status = 'cancelled', decided_at = now() where id = i.id;
    raise exception 'this team is no longer forming';
  end if;
  if exists (
    select 1 from tournament_team_members m join tournament_teams x on x.id = m.team_id
    where m.tournament_id = i.tournament_id and m.student_id = auth.uid() and x.status not in ('withdrawn', 'rejected')
  ) then
    update team_invitations set status = 'cancelled', decided_at = now() where id = i.id;
    raise exception 'you are already in a team for this tournament';
  end if;
  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (t.id, t.tournament_id, auth.uid(), t.org_id);
  update team_invitations set status = 'accepted', decided_at = now() where id = i.id;
  update team_invitations set status = 'cancelled', decided_at = now()
   where student_id = auth.uid() and tournament_id = i.tournament_id and status = 'pending';
end;
$$ language plpgsql security definer set search_path = public;

create or replace function cancel_team_invitation(p_invitation uuid)
returns void as $$
declare
  i team_invitations;
  t tournament_teams;
begin
  select * into i from team_invitations where id = p_invitation for update;
  if i.id is null then raise exception 'not found'; end if;
  select * into t from tournament_teams where id = i.team_id;
  if not (t.captain_id = auth.uid() or (t.org_id is not null and can_manage_org(t.org_id))) then raise exception 'not allowed'; end if;
  update team_invitations set status = 'cancelled', decided_at = now() where id = i.id and status = 'pending';
end;
$$ language plpgsql security definer set search_path = public;

create or replace function leave_team(p_team uuid)
returns void as $$
declare
  t tournament_teams;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or not exists (select 1 from tournament_team_members where team_id = p_team and student_id = auth.uid()) then
    raise exception 'not allowed';
  end if;
  if t.status <> 'draft' then raise exception 'ask your school staff: a submitted team can only change if they send it back'; end if;
  delete from tournament_team_members where team_id = p_team and student_id = auth.uid();
  if not exists (select 1 from tournament_team_members where team_id = p_team) then
    perform set_config('app.trusted_portal_write', 'true', true);
    update tournament_teams set status = 'withdrawn' where id = p_team;
    perform set_config('app.trusted_portal_write', '', true);
    update team_invitations set status = 'cancelled', decided_at = now() where team_id = p_team and status = 'pending';
  end if;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function submit_team(p_team uuid)
returns void as $$
declare
  t tournament_teams;
  v_size int;
  v_conv uuid;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or t.org_id is null or t.captain_id is distinct from auth.uid() then raise exception 'only the captain can submit the team'; end if;
  if t.status <> 'draft' then raise exception 'this team has already been submitted'; end if;
  if not exists (select 1 from tournaments where id = t.tournament_id and status = 'upcoming') then raise exception 'this tournament is not open for teams'; end if;
  select team_size into v_size from tournaments where id = t.tournament_id;
  if (select count(*) from tournament_team_members where team_id = p_team) <> v_size then
    raise exception 'a team needs exactly % players before it can be submitted', v_size;
  end if;
  perform set_config('app.trusted_portal_write', 'true', true);
  update tournament_teams set status = 'proposed', submitted_at = now(), staff_note = '' where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);
  update team_invitations set status = 'cancelled', decided_at = now() where team_id = p_team and status = 'pending';
  select id into v_conv from conversations where team_id = p_team;
  if v_conv is not null then perform chat_post_system(v_conv, auth.uid(), 'Team submitted to the school staff for approval'); end if;
end;
$$ language plpgsql security definer set search_path = public;

-- School staff send a submitted team back (to fix players, for example).
create or replace function return_team(p_team uuid, p_note text default '')
returns void as $$
declare
  t tournament_teams;
  v_conv uuid;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or t.org_id is null or not can_manage_org(t.org_id) then raise exception 'not allowed'; end if;
  if t.status <> 'proposed' then raise exception 'only a submitted team can be sent back'; end if;
  perform set_config('app.trusted_portal_write', 'true', true);
  update tournament_teams set status = 'draft', staff_note = left(coalesce(p_note, ''), 300) where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);
  perform log_audit('return_team', 'tournament_team', p_team, jsonb_build_object('note', left(coalesce(p_note, ''), 300)));
  select id into v_conv from conversations where team_id = p_team;
  if v_conv is not null then
    perform chat_post_system(v_conv, auth.uid(), 'Sent back by the school staff' || case when coalesce(p_note, '') <> '' then ': ' || left(p_note, 300) else '' end);
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- Applying (with the payment step) is the school staff's approval. It now accepts a
-- submitted team, and a school team must have exactly the tournament's team size.
create or replace function apply_team(p_team uuid, p_payment_declared boolean)
returns void as $$
declare
  t tournament_teams;
  v_size int;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or not can_run_team(t) then raise exception 'not allowed'; end if;
  if t.status not in ('draft', 'proposed') then raise exception 'this team has already applied'; end if;
  if not exists (select 1 from tournaments where id = t.tournament_id and status = 'upcoming') then
    raise exception 'this tournament is not open for applications';
  end if;
  if not exists (select 1 from tournament_team_members where team_id = p_team) then
    raise exception 'a team needs at least one member to apply';
  end if;
  if t.org_id is not null then
    select team_size into v_size from tournaments where id = t.tournament_id;
    if (select count(*) from tournament_team_members where team_id = p_team) <> v_size then
      raise exception 'a team needs exactly % players to apply', v_size;
    end if;
  end if;
  perform set_config('app.trusted_portal_write', 'true', true);
  update tournament_teams set
    status = case when coalesce(p_payment_declared, false) then 'payment_declared'::team_status else 'applied'::team_status end,
    payment_declared = coalesce(p_payment_declared, false)
  where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);
  update team_invitations set status = 'cancelled', decided_at = now() where team_id = p_team and status = 'pending';
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- What the screens read
-- ---------------------------------------------------------------------------
-- How many team slots the school has and how many are used (any member of the school).
create or replace function team_slot_status(p_tournament uuid, p_org uuid default null)
returns jsonb as $$
declare
  v_org uuid := coalesce(p_org, my_org_id());
  v_max int;
  v_used int;
  v_size int;
begin
  if v_org is null or not (is_org_member(v_org) or is_manager() or is_hanbee_staff()) then raise exception 'not allowed'; end if;
  select max_teams into v_max from school_team_slots where tournament_id = p_tournament and org_id = v_org;
  select count(*) into v_used from tournament_teams where tournament_id = p_tournament and org_id = v_org and status not in ('withdrawn', 'rejected');
  select team_size into v_size from tournaments where id = p_tournament;
  return jsonb_build_object('max_teams', v_max, 'used', v_used, 'remaining', case when v_max is null then null else greatest(v_max - v_used, 0) end, 'team_size', v_size);
end;
$$ language plpgsql stable security definer set search_path = public;

-- Everything the student's Team page needs in one call.
create or replace function my_team_formation(p_tournament uuid)
returns jsonb as $$
declare
  v_org uuid := my_org_id();
  t tournament_teams;
  v_conv uuid;
  res jsonb;
begin
  if my_role() is distinct from 'student' or not is_active_account() then raise exception 'not allowed'; end if;
  select x.* into t
  from tournament_teams x join tournament_team_members m on m.team_id = x.id
  where m.tournament_id = p_tournament and m.student_id = auth.uid() and x.status not in ('withdrawn', 'rejected')
  limit 1;
  select id into v_conv from conversations where team_id = t.id;
  select jsonb_build_object(
    'school_id', v_org,
    'slots', case when v_org is null then null else team_slot_status(p_tournament, v_org) end,
    'my_team', case when t.id is null then null else jsonb_build_object(
      'id', t.id, 'name', t.name, 'status', t.status, 'is_captain', t.captain_id = auth.uid(),
      'staff_note', t.staff_note, 'chat_id', v_conv,
      'members', (select coalesce(jsonb_agg(jsonb_build_object('student_id', m.student_id, 'name', p.full_name, 'is_captain', m.student_id = t.captain_id) order by m.joined_at), '[]'::jsonb)
                    from tournament_team_members m join profiles p on p.id = m.student_id where m.team_id = t.id),
      'pending_invites', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'student_id', i.student_id, 'name', p.full_name) order by i.created_at), '[]'::jsonb)
                    from team_invitations i join profiles p on p.id = i.student_id where i.team_id = t.id and i.status = 'pending')
    ) end,
    'invitations', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'team_id', i.team_id, 'team_name', x.name, 'invited_by', ib.full_name, 'members', (select count(*) from tournament_team_members mm where mm.team_id = x.id)) order by i.created_at), '[]'::jsonb)
                      from team_invitations i join tournament_teams x on x.id = i.team_id and x.status = 'draft'
                      left join profiles ib on ib.id = i.invited_by
                     where i.student_id = auth.uid() and i.tournament_id = p_tournament and i.status = 'pending'),
    'eligible_classmates', case when t.id is null or t.captain_id is distinct from auth.uid() or t.status <> 'draft' then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object('student_id', pr.id, 'name', pr.full_name) order by pr.full_name), '[]'::jsonb)
         from organization_members om join profiles pr on pr.id = om.user_id
        where om.org_id = t.org_id and om.status = 'active' and om.member_role = 'student' and pr.account_status = 'active'
          and not exists (select 1 from tournament_team_members m2 join tournament_teams x2 on x2.id = m2.team_id
                           where m2.tournament_id = p_tournament and m2.student_id = pr.id and x2.status not in ('withdrawn', 'rejected'))
          and not exists (select 1 from team_invitations i2 where i2.team_id = t.id and i2.student_id = pr.id and i2.status = 'pending')) end
  ) into res;
  return res;
end;
$$ language plpgsql stable security definer set search_path = public;

-- School staff, Hanbee staff and the manager: every team of a school in a tournament.
create or replace function team_formation_overview(p_tournament uuid, p_org uuid)
returns table (
  team_id uuid, name text, status text, captain_name text, member_count int, team_size int,
  pending_invites int, submitted_at timestamptz, staff_note text, chat_id uuid
) as $$
begin
  if not (can_manage_org(p_org) or is_manager() or is_hanbee_staff()) then raise exception 'not allowed'; end if;
  return query
  select t.id, t.name, t.status::text, cp.full_name,
         (select count(*)::int from tournament_team_members m where m.team_id = t.id),
         (select tt.team_size from tournaments tt where tt.id = t.tournament_id),
         (select count(*)::int from team_invitations i where i.team_id = t.id and i.status = 'pending'),
         t.submitted_at, t.staff_note,
         (select c.id from conversations c where c.team_id = t.id)
  from tournament_teams t left join profiles cp on cp.id = t.captain_id
  where t.tournament_id = p_tournament and t.org_id = p_org
  order by (t.status = 'proposed') desc, t.created_at;
end;
$$ language plpgsql stable security definer set search_path = public;

-- The team statistics panel inside the team chat.
create or replace function team_statistics(p_team uuid)
returns jsonb as $$
declare
  t tournament_teams;
  tr tournaments;
  res jsonb;
begin
  select * into t from tournament_teams where id = p_team;
  if t.id is null or not team_visible_to_me(p_team) then raise exception 'not allowed'; end if;
  select * into tr from tournaments where id = t.tournament_id;
  select jsonb_build_object(
    'team', jsonb_build_object('id', t.id, 'name', t.name, 'status', t.status, 'team_size', tr.team_size,
                               'members_count', (select count(*) from tournament_team_members where team_id = t.id)),
    'tournament', jsonb_build_object('id', tr.id, 'title', tr.title, 'starts_at', tr.starts_at, 'venue', tr.venue, 'status', tr.status),
    'result', (select jsonb_build_object('rank', r.rank, 'points', r.points, 'notes', r.notes) from tournament_results r where r.team_id = t.id),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'student_id', m.student_id, 'name', p.full_name, 'is_captain', m.student_id = t.captain_id,
        'lessons_completed', coalesce(pr.completed, 0), 'lessons_total', coalesce(pr.total, 0),
        'completion_pct', case when coalesce(pr.total, 0) > 0 then round(100.0 * pr.completed / pr.total) else 0 end,
        'sessions', coalesce(at.n, 0),
        'attendance_pct', case when coalesce(at.n, 0) > 0 then round(100.0 * at.attended / at.n) else null end
      ) order by m.joined_at), '[]'::jsonb)
      from tournament_team_members m
      join profiles p on p.id = m.student_id
      left join lateral (
        select sum(ep.completed)::int completed, sum(ep.total)::int total
        from internal_enrollment_progress() ep where ep.student_id = m.student_id and ep.status in ('active', 'completed')
      ) pr on true
      left join lateral (
        select count(*)::int n, count(*) filter (where am.status in ('present', 'late'))::int attended
        from attendance_marks am join enrollments e on e.id = am.enrollment_id where e.student_id = m.student_id
      ) at on true
      where m.team_id = t.id)
  ) into res;
  return res;
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function
  set_team_slots(uuid, uuid, int), student_start_team(uuid, text), invite_to_team(uuid, uuid),
  respond_team_invitation(uuid, boolean), cancel_team_invitation(uuid), leave_team(uuid), submit_team(uuid),
  return_team(uuid, text), team_slot_status(uuid, uuid), my_team_formation(uuid), team_formation_overview(uuid, uuid),
  team_statistics(uuid), team_visible_to_me(uuid) from public, anon;
grant execute on function
  set_team_slots(uuid, uuid, int), student_start_team(uuid, text), invite_to_team(uuid, uuid),
  respond_team_invitation(uuid, boolean), cancel_team_invitation(uuid), leave_team(uuid), submit_team(uuid),
  return_team(uuid, text), team_slot_status(uuid, uuid), my_team_formation(uuid), team_formation_overview(uuid, uuid),
  team_statistics(uuid), team_visible_to_me(uuid) to authenticated;
