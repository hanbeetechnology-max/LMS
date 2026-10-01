-- Two real gaps in tournament_results (0027): set_result silently
-- overwrites a prior result with no record of what the old value was or
-- who changed it, and nothing stops two teams sharing the same rank in one
-- tournament (rank is staff-typed, not computed). This adds a history
-- table fed by a trigger (BEFORE UPDATE OR DELETE, same pattern used
-- elsewhere for guard triggers), a uniqueness constraint on
-- (tournament_id, rank), and a friendlier error when set_result would
-- violate it.

create table tournament_results_history (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null,
  tournament_id uuid not null,
  team_id uuid not null,
  rank int not null,
  points int not null,
  notes text not null,
  action text not null check (action in ('update', 'delete')),
  changed_by uuid references profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index on tournament_results_history (tournament_id, team_id, changed_at desc);

alter table tournament_results_history enable row level security;
create policy "manager and Hanbee staff read result history"
  on tournament_results_history for select
  using (is_manager() or is_hanbee_staff());

create or replace function log_tournament_result_change()
returns trigger as $$
begin
  insert into tournament_results_history (result_id, tournament_id, team_id, rank, points, notes, action, changed_by)
  values (old.id, old.tournament_id, old.team_id, old.rank, old.points, old.notes,
    case when tg_op = 'DELETE' then 'delete' else 'update' end, auth.uid());
  -- BEFORE trigger: the returned row becomes what gets written (UPDATE) or
  -- whether the op proceeds at all (DELETE) - returning old unconditionally
  -- would silently discard every update's new values.
  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists tournament_results_history_trigger on tournament_results;
create trigger tournament_results_history_trigger
  before update or delete on tournament_results
  for each row execute function log_tournament_result_change();

-- A duplicate rank within the same tournament is now a real constraint
-- violation, not just a staff mistake nobody notices.
alter table tournament_results add constraint tournament_results_rank_unique unique (tournament_id, rank);

create or replace function set_result(p_tournament uuid, p_team uuid, p_rank int, p_points int, p_notes text)
returns uuid as $$
declare v_id uuid;
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'only Hanbee staff may set results'; end if;
  if not exists (select 1 from tournament_teams where id = p_team and tournament_id = p_tournament and status = 'verified') then
    raise exception 'results can only be set for a verified team of this tournament';
  end if;
  begin
    insert into tournament_results (tournament_id, team_id, rank, points, notes)
    values (p_tournament, p_team, p_rank, p_points, coalesce(p_notes, ''))
    on conflict (tournament_id, team_id) do update set rank = excluded.rank, points = excluded.points, notes = excluded.notes
    returning id into v_id;
  exception when unique_violation then
    raise exception 'rank % is already taken by another team in this tournament', p_rank;
  end;
  perform log_audit('set_result', 'tournament', p_tournament, jsonb_build_object('team_id', p_team, 'rank', p_rank, 'points', p_points));
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;
