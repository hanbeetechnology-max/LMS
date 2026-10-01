-- team_invitations (0039) has no expiry - a pending invitation sent once
-- and never answered stays "pending" forever, and since
-- team_invitations_one_pending is a unique index on (team_id, student_id)
-- where status = 'pending', a stale invite permanently blocks re-inviting
-- that same student to that same team. Adds a 7-day expiry, enforced both
-- when responding (an expired invite is rejected, not silently accepted)
-- and when inviting again (an expired pending row is first auto-cancelled
-- so the unique index doesn't block a fresh invite).

alter table team_invitations add column expires_at timestamptz not null default (now() + interval '7 days');

create or replace function respond_team_invitation(p_invitation uuid, p_accept boolean)
returns void as $$
declare
  i team_invitations;
  t tournament_teams;
begin
  select * into i from team_invitations where id = p_invitation for update;
  if i.id is null or i.student_id <> auth.uid() then raise exception 'not allowed'; end if;
  if i.status <> 'pending' then raise exception 'this invitation has already been answered'; end if;
  if i.expires_at < now() then
    update team_invitations set status = 'cancelled', decided_at = now() where id = i.id;
    raise exception 'this invitation has expired';
  end if;
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
  -- An expired pending invite no longer blocks a fresh one via the unique
  -- (team_id, student_id) where status='pending' index.
  update team_invitations set status = 'cancelled', decided_at = now()
    where team_id = p_team and student_id = p_student and status = 'pending' and expires_at < now();
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
