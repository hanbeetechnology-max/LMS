-- Complete the solo-student tournament path and expose the Hanbee review queue.

create or replace function create_solo_team(p_tournament uuid)
returns uuid as $$
declare
  v_id uuid;
  v_name text;
begin
  if not is_solo_student() or not is_active_account() then
    raise exception 'only an active solo student may enter as a team of one';
  end if;
  if not exists (select 1 from tournaments where id = p_tournament and status = 'upcoming') then
    raise exception 'this tournament is not open for entries';
  end if;
  if exists (
    select 1 from tournament_team_members m
    join tournament_teams t on t.id = m.team_id
    where m.tournament_id = p_tournament and m.student_id = auth.uid()
      and t.status not in ('withdrawn', 'rejected')
  ) then
    raise exception 'you already have an entry for this tournament';
  end if;

  select left(coalesce(nullif(trim(full_name), ''), 'Solo student'), 60)
    into v_name from profiles where id = auth.uid();
  perform set_config('app.trusted_portal_write', 'true', true);
  insert into tournament_teams (tournament_id, org_id, name, created_by, captain_id)
  values (p_tournament, null, v_name, auth.uid(), auth.uid())
  returning id into v_id;
  perform set_config('app.trusted_portal_write', '', true);

  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (v_id, p_tournament, auth.uid(), null);
  perform log_audit('create_solo_tournament_entry', 'tournament_team', v_id, '{}'::jsonb);
  return v_id;
exception when others then
  perform set_config('app.trusted_portal_write', '', true);
  raise;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function tournament_application_queue()
returns table (
  team_id uuid,
  tournament_id uuid,
  tournament_title text,
  team_name text,
  org_id uuid,
  school_name text,
  captain_name text,
  member_count bigint,
  status text,
  payment_declared boolean,
  submitted_at timestamptz
) as $$
begin
  if not (is_active_account() and is_staff_or_manager()) then
    raise exception 'only Hanbee staff or a manager can review tournament entries';
  end if;
  return query
    select t.id, t.tournament_id, tr.title, t.name, t.org_id, o.name, p.full_name,
           (select count(*) from tournament_team_members m where m.team_id = t.id),
           t.status::text, t.payment_declared, t.submitted_at
    from tournament_teams t
    join tournaments tr on tr.id = t.tournament_id
    left join organizations o on o.id = t.org_id
    left join profiles p on p.id = t.captain_id
    where t.status in ('applied', 'payment_declared')
    order by t.submitted_at nulls last, t.created_at;
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function tournament_application_queue() from public, anon;
grant execute on function tournament_application_queue() to authenticated;
revoke all on function create_solo_team(uuid) from public, anon;
grant execute on function create_solo_team(uuid) to authenticated;
